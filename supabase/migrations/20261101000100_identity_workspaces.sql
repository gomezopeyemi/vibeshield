-- Stage 2 · slice 1 — identity, workspaces, membership and roles.
--
-- Tenancy model (ADR-004): every workspace-owned row carries workspace_id and is
-- guarded by RLS that asks "is the caller a member, with a sufficient role?".
-- Role checks live in SECURITY DEFINER helpers in a non-exposed `private`
-- schema, so policies never query workspace_members recursively.
--
-- Privileges are explicit: Supabase grants ALL on new public tables to
-- anon/authenticated by default, so each table revokes that and grants back
-- only what the policies are meant to allow. `anon` gets nothing.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create type public.workspace_role as enum ('owner', 'admin', 'developer', 'viewer');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '' check (char_length(full_name) <= 80),
  avatar_url  text check (avatar_url is null or avatar_url ~ '^https://'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 1 and 80),
  slug        text not null unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$'),
  -- Set by billing (service role) only; users cannot grant themselves a plan.
  plan        text not null default 'free' check (plan in ('free', 'builder', 'pro', 'team')),
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  role         public.workspace_role not null default 'viewer',
  created_at   timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index workspace_members_user_id_idx on public.workspace_members (user_id);

-- ---------------------------------------------------------------------------
-- Role helpers (used by RLS). STABLE + SECURITY DEFINER + empty search_path.
-- ---------------------------------------------------------------------------

create function private.workspace_role_of(ws uuid)
returns public.workspace_role
language sql stable security definer set search_path = ''
as $$
  select m.role from public.workspace_members m
  where m.workspace_id = ws and m.user_id = (select auth.uid());
$$;

create function private.is_workspace_member(ws uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.workspace_role_of(ws) is not null;
$$;

create function private.has_workspace_role(ws uuid, roles public.workspace_role[])
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(private.workspace_role_of(ws) = any (roles), false);
$$;

create function private.shares_workspace_with(other uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members mine
    join public.workspace_members theirs on theirs.workspace_id = mine.workspace_id
    where mine.user_id = (select auth.uid()) and theirs.user_id = other
  );
$$;

revoke all on function private.workspace_role_of(uuid), private.is_workspace_member(uuid),
  private.has_workspace_role(uuid, public.workspace_role[]), private.shares_workspace_with(uuid)
  from public, anon;
grant execute on function private.workspace_role_of(uuid), private.is_workspace_member(uuid),
  private.has_workspace_role(uuid, public.workspace_role[]), private.shares_workspace_with(uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Integrity triggers
-- ---------------------------------------------------------------------------

create function private.touch_updated_at()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function private.touch_updated_at();
create trigger workspaces_touch before update on public.workspaces
  for each row execute function private.touch_updated_at();

-- Membership rules enforced for every writer that is subject to RLS:
--  * nobody changes their own role or removes themselves via the table
--    (leaving / transferring ownership will get dedicated functions);
--  * only owners create, promote to, demote from, or remove owners;
--  * a workspace always keeps at least one owner (applies to everyone).
create function private.guard_membership()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  actor_role public.workspace_role;
  ws uuid := coalesce(new.workspace_id, old.workspace_id);
begin
  -- Cascades from a deleted workspace or a deleted account need no checks.
  if tg_op = 'DELETE' and (
       not exists (select 1 from public.workspaces w where w.id = old.workspace_id)
       or not exists (select 1 from auth.users u where u.id = old.user_id)) then
    return old;
  end if;

  -- Bootstrap: the first member of an empty workspace must be its owner. Only
  -- definer functions reach this (RLS stops users inserting where they hold no role).
  if tg_op = 'INSERT' and not exists (
       select 1 from public.workspace_members m where m.workspace_id = new.workspace_id) then
    if new.role <> 'owner' then
      raise exception 'The first member of a workspace must be its owner' using errcode = '23514';
    end if;
    return new;
  end if;

  if actor is not null then
    if (tg_op in ('UPDATE', 'DELETE') and old.user_id = actor)
       or (tg_op = 'INSERT' and new.user_id = actor) then
      raise exception 'You cannot change your own membership' using errcode = '42501';
    end if;

    select m.role into actor_role from public.workspace_members m
      where m.workspace_id = ws and m.user_id = actor;

    if actor_role is distinct from 'owner'
       and ((tg_op in ('UPDATE', 'DELETE') and old.role = 'owner')
            or (tg_op in ('INSERT', 'UPDATE') and new.role = 'owner')) then
      raise exception 'Only an owner can manage owners' using errcode = '42501';
    end if;
  end if;

  if tg_op in ('UPDATE', 'DELETE') and old.role = 'owner'
     and (tg_op = 'DELETE' or new.role <> 'owner')
     and not exists (
       select 1 from public.workspace_members m
       where m.workspace_id = old.workspace_id and m.role = 'owner' and m.user_id <> old.user_id
     ) then
    raise exception 'A workspace must keep at least one owner' using errcode = '23514';
  end if;

  return coalesce(new, old);
end;
$$;

create trigger workspace_members_guard
  before insert or update or delete on public.workspace_members
  for each row execute function private.guard_membership();

-- A workspace left with no members (its only member deleted their account) is
-- unreachable by anyone; remove it rather than keep orphaned data.
create function private.drop_empty_workspace()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.workspaces w
  where w.id = old.workspace_id
    and not exists (select 1 from public.workspace_members m where m.workspace_id = old.workspace_id);
  return null;
end;
$$;

create trigger workspace_members_drop_empty
  after delete on public.workspace_members
  for each row execute function private.drop_empty_workspace();

-- ---------------------------------------------------------------------------
-- Functions callable by signed-in users
-- ---------------------------------------------------------------------------

-- Creating a workspace must also create the owner membership atomically,
-- which a plain INSERT under RLS cannot do (the creator isn't a member yet).
create function public.create_workspace(ws_name text, ws_slug text)
returns public.workspaces
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  created public.workspaces;
begin
  if actor is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  insert into public.workspaces (name, slug, created_by)
    values (btrim(ws_name), ws_slug, actor)
    returning * into created;
  -- Allowed by the guard's bootstrap rule: first member of an empty workspace, as owner.
  insert into public.workspace_members (workspace_id, user_id, role)
    values (created.id, actor, 'owner');
  return created;
end;
$$;

revoke all on function public.create_workspace(text, text) from public, anon;
grant execute on function public.create_workspace(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- New account bootstrap: profile + personal workspace + owner membership.
-- ---------------------------------------------------------------------------

create function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  display text := left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 80);
  ws_id uuid;
begin
  insert into public.profiles (id, full_name) values (new.id, display);

  insert into public.workspaces (name, slug, created_by)
    values ('Personal', 'personal-' || substr(replace(new.id::text, '-', ''), 1, 12), new.id)
    returning id into ws_id;

  insert into public.workspace_members (workspace_id, user_id, role)
    values (ws_id, new.id, 'owner');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security + explicit privileges
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;

revoke all on public.profiles, public.workspaces, public.workspace_members from anon, authenticated;

-- profiles: see yourself and people you share a workspace with; edit only yourself.
grant select on public.profiles to authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;

create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or private.shares_workspace_with(id));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- workspaces: members read; owner/admin rename; owner deletes; create via create_workspace().
grant select, delete on public.workspaces to authenticated;
grant update (name, slug) on public.workspaces to authenticated;

create policy workspaces_select on public.workspaces for select to authenticated
  using (private.is_workspace_member(id));
create policy workspaces_update on public.workspaces for update to authenticated
  using (private.has_workspace_role(id, array['owner', 'admin']::public.workspace_role[]))
  with check (private.has_workspace_role(id, array['owner', 'admin']::public.workspace_role[]));
create policy workspaces_delete on public.workspaces for delete to authenticated
  using (private.has_workspace_role(id, array['owner']::public.workspace_role[]));

-- workspace_members: members see the roster; owner/admin manage it (trigger adds owner rules).
grant select, insert, delete on public.workspace_members to authenticated;
grant update (role) on public.workspace_members to authenticated;

create policy members_select on public.workspace_members for select to authenticated
  using (private.is_workspace_member(workspace_id));
create policy members_insert on public.workspace_members for insert to authenticated
  with check (private.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy members_update on public.workspace_members for update to authenticated
  using (private.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  with check (private.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
create policy members_delete on public.workspace_members for delete to authenticated
  using (private.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
