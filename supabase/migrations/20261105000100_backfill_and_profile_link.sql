-- Stage 2 · slice 2 — backfill accounts created before slice 1, and link
-- memberships to profiles so the API can return a roster with names.

-- 1. Profiles for any existing account that doesn't have one.
insert into public.profiles (id, full_name)
select u.id, left(btrim(coalesce(u.raw_user_meta_data ->> 'full_name', '')), 80)
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

-- 2. A Personal workspace (owner) for any account that belongs to none.
--    Same slug rule as the sign-up trigger; the membership guard's bootstrap
--    rule accepts an owner as the first member of an empty workspace.
with missing as (
  select u.id
  from auth.users u
  where not exists (select 1 from public.workspace_members m where m.user_id = u.id)
),
created as (
  insert into public.workspaces (name, slug, created_by)
  select 'Personal', 'personal-' || substr(replace(id::text, '-', ''), 1, 12), id
  from missing
  returning id, created_by
)
insert into public.workspace_members (workspace_id, user_id, role)
select id, created_by, 'owner' from created;

-- 3. Every member has a profile (sign-up trigger + backfill), so this holds.
--    It lets PostgREST embed profiles(full_name) when listing members.
alter table public.workspace_members
  add constraint workspace_members_profile_fk
  foreign key (user_id) references public.profiles (id) on delete cascade;
