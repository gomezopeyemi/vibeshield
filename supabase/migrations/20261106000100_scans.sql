-- Stage 2 · slice 3 — workspace-owned scan history.
--
-- A scan result is evidence. If members could write these rows they could file
-- a clean score for code that was never scanned (and the verification badge
-- will rest on these rows). So members only READ them, through RLS; the rows
-- are written by the server's scanner via public.record_scan(), which only the
-- service_role can execute. Replaces the legacy single-table `vs_scans`.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.scans (
  id            text primary key check (id ~ '^scan_[a-z0-9]{1,16}_[a-f0-9]{8}$'),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  created_by    uuid references auth.users (id) on delete set null,
  source_kind   text not null check (source_kind in ('sample', 'local', 'github')),
  source_id     text not null check (char_length(source_id) between 1 and 200),
  source_label  text not null check (char_length(source_label) between 1 and 200),
  branch        text not null check (char_length(branch) between 1 and 255),
  commit_sha    text check (commit_sha is null or char_length(commit_sha) <= 64),
  status        text not null check (status in ('queued', 'running', 'completed', 'partial', 'failed', 'cancelled')),
  started_at    timestamptz not null,
  finished_at   timestamptz,
  duration_ms   integer check (duration_ms >= 0),
  scanners      text[] not null default '{}',
  file_count    integer not null default 0 check (file_count >= 0),
  finding_count integer not null default 0 check (finding_count >= 0),
  error         text check (error is null or char_length(error) <= 2000),
  created_at    timestamptz not null default now(),
  -- Target for the composite foreign keys below, which pin every child row to
  -- its scan's workspace (a child can't claim a different workspace_id).
  unique (workspace_id, id)
);
create index scans_workspace_finished_idx on public.scans (workspace_id, finished_at desc);

-- One per scored scan. Kept apart from `scans` so score history has its own
-- record of which formula produced it (ADR-008).
create table public.score_snapshots (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null,
  scan_id         text not null unique,
  score           smallint not null check (score between 0 and 100),
  pillars         jsonb not null check (
                    jsonb_typeof(pillars) = 'object'
                    and pillars ?& array['security', 'finops', 'revenue', 'code-health']),
  formula_version text not null check (char_length(formula_version) between 1 and 40),
  created_at      timestamptz not null default now(),
  foreign key (workspace_id, scan_id) references public.scans (workspace_id, id) on delete cascade
);
create index score_snapshots_workspace_idx on public.score_snapshots (workspace_id, created_at desc);

-- Findings as produced by one scan. `id` is the scanner's content hash
-- (rule + path + line), stable across scans for comparison; `ord` keeps the
-- scanner's order and makes the key, since a hash may legitimately repeat.
create table public.findings (
  workspace_id    uuid not null,
  scan_id         text not null,
  ord             integer not null check (ord >= 0),
  id              text not null check (char_length(id) between 1 and 128),
  pillar          text not null check (pillar in ('security', 'finops', 'revenue', 'code-health')),
  severity        text not null check (severity in ('critical', 'high', 'medium', 'low', 'info')),
  status          text not null default 'open' check (status in
                    ('open', 'fix-proposed', 'pr-open', 'pr-merged', 'resolved', 'verifying', 'regressed', 'dismissed')),
  scanner         text not null check (char_length(scanner) between 1 and 40),
  title           text not null check (char_length(title) between 1 and 300),
  human_summary   text not null default '',
  business_impact text not null default '',
  evidence        text not null default '',
  recommendation  text not null default '',
  context         jsonb check (context is null or jsonb_typeof(context) = 'object'),
  resource        text,
  score_delta     smallint check (score_delta between 0 and 100),
  detected_at     timestamptz not null,
  primary key (scan_id, ord),
  foreign key (workspace_id, scan_id) references public.scans (workspace_id, id) on delete cascade
);
create index findings_scan_id_idx on public.findings (scan_id, id);
create index findings_workspace_idx on public.findings (workspace_id);

create table public.scan_events (
  workspace_id uuid not null,
  scan_id      text not null,
  seq          integer not null check (seq >= 0),
  at           timestamptz not null,
  scanner      text not null check (char_length(scanner) between 1 and 40),
  level        text not null check (level in ('info', 'check', 'warn', 'fail', 'phase')),
  message      text not null check (char_length(message) <= 2000),
  path         text,
  line         integer check (line > 0),
  primary key (scan_id, seq),
  foreign key (workspace_id, scan_id) references public.scans (workspace_id, id) on delete cascade
);
create index scan_events_workspace_idx on public.scan_events (workspace_id);

-- ---------------------------------------------------------------------------
-- Writer: one scan, its findings, events and score, in one transaction.
-- SECURITY INVOKER: it has no powers of its own beyond the caller's.
-- ---------------------------------------------------------------------------

create function public.record_scan(scan jsonb)
returns text
language plpgsql security invoker set search_path = ''
as $$
declare
  v_id    text := scan ->> 'id';
  v_ws    uuid := (scan ->> 'workspace_id')::uuid;
  v_actor uuid := (scan ->> 'created_by')::uuid;
begin
  -- The app checks the role before scanning; re-check here so a bug there
  -- can't file a scan into a workspace the actor can't scan in.
  if v_actor is null or not exists (
    select 1 from public.workspace_members m
    where m.workspace_id = v_ws and m.user_id = v_actor
      and m.role in ('owner', 'admin', 'developer')
  ) then
    raise exception 'Scanning requires the owner, admin or developer role in this workspace'
      using errcode = '42501';
  end if;

  insert into public.scans (id, workspace_id, created_by, source_kind, source_id, source_label, branch,
                            commit_sha, status, started_at, finished_at, duration_ms, scanners,
                            file_count, finding_count, error)
  values (
    v_id, v_ws, v_actor,
    scan #>> '{source,kind}', scan #>> '{source,id}', scan #>> '{source,label}', scan #>> '{source,branch}',
    scan #>> '{source,commit}',
    scan ->> 'status',
    (scan ->> 'started_at')::timestamptz,
    (scan ->> 'finished_at')::timestamptz,
    (scan ->> 'duration_ms')::integer,
    coalesce(array(select jsonb_array_elements_text(scan -> 'scanners')), '{}'),
    coalesce((scan ->> 'file_count')::integer, 0),
    coalesce(jsonb_array_length(scan -> 'findings'), 0),
    scan ->> 'error'
  );

  insert into public.findings (workspace_id, scan_id, ord, id, pillar, severity, status, scanner, title,
                               human_summary, business_impact, evidence, recommendation, context,
                               resource, score_delta, detected_at)
  select v_ws, v_id, (e.ord - 1)::integer,
         f ->> 'id', f ->> 'pillar', f ->> 'severity', coalesce(f ->> 'status', 'open'), f ->> 'scanner',
         f ->> 'title',
         coalesce(f ->> 'human_summary', ''), coalesce(f ->> 'business_impact', ''),
         coalesce(f ->> 'evidence', ''), coalesce(f ->> 'recommendation', ''),
         nullif(f -> 'context', 'null'::jsonb),
         f ->> 'resource', (f ->> 'score_delta')::smallint, (f ->> 'detected_at')::timestamptz
  from jsonb_array_elements(coalesce(scan -> 'findings', '[]'::jsonb)) with ordinality as e (f, ord);

  insert into public.scan_events (workspace_id, scan_id, seq, at, scanner, level, message, path, line)
  select v_ws, v_id, (e.ord - 1)::integer,
         (ev ->> 'at')::timestamptz, ev ->> 'scanner', ev ->> 'level', ev ->> 'message',
         ev ->> 'path', (ev ->> 'line')::integer
  from jsonb_array_elements(coalesce(scan -> 'events', '[]'::jsonb)) with ordinality as e (ev, ord);

  -- Only a scan that produced a score gets a snapshot; a failed scan has none
  -- (it must never read as a score of 0 or as clean).
  if scan ? 'score' and jsonb_typeof(scan -> 'score') = 'number' then
    insert into public.score_snapshots (workspace_id, scan_id, score, pillars, formula_version)
    values (v_ws, v_id, (scan ->> 'score')::smallint, scan -> 'pillars', scan ->> 'formula_version');
  end if;

  return v_id;
end;
$$;

revoke all on function public.record_scan(jsonb) from public, anon, authenticated;
grant execute on function public.record_scan(jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- Row Level Security + explicit privileges: members read, nobody else.
-- ---------------------------------------------------------------------------

alter table public.scans enable row level security;
alter table public.score_snapshots enable row level security;
alter table public.findings enable row level security;
alter table public.scan_events enable row level security;

revoke all on public.scans, public.score_snapshots, public.findings, public.scan_events from anon, authenticated;
grant select on public.scans, public.score_snapshots, public.findings, public.scan_events to authenticated;

create policy scans_select on public.scans for select to authenticated
  using (private.is_workspace_member(workspace_id));
create policy score_snapshots_select on public.score_snapshots for select to authenticated
  using (private.is_workspace_member(workspace_id));
create policy findings_select on public.findings for select to authenticated
  using (private.is_workspace_member(workspace_id));
create policy scan_events_select on public.scan_events for select to authenticated
  using (private.is_workspace_member(workspace_id));
