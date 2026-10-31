# VibeShield — Architecture Decisions

Status key: **Accepted** (go ahead) · **Proposed** (needs your confirmation) · **Open** (blocked on a decision).

## ADR-001 — Keep the Next.js 16 app; add a separate worker later — Accepted
The UI and API layer stay in the existing Next app. Scanning moves out of the web process into isolated workers in Stage 4. Until then the in-process regex scanner remains but is labelled for what it is (ADR-007).

## ADR-002 — Dedicated Supabase project for VibeShield — **Accepted (2026-10-31)**
Decision: the founder creates a dedicated VibeShield project and supplies its keys via `.env.local`; Claude never handles the keys. The existing project stays untouched.

`kowvnkydqqiaezqqejfr` already hosts an unrelated interior-design marketplace (tables `designers`, `projects`, `conversations`, `messages`, `consultations`, plus `profiles`/`notifications`). Putting VibeShield's auth users, workspaces and RLS there would share `auth.users` and migration history between two products and collide on table names.
**Recommendation:** create a new Supabase project for VibeShield (dev), later a second one for production; leave the existing project untouched. Alternative: reuse it under a dedicated schema (`vibeshield`) — workable but `auth.users` would still be shared.

## ADR-003 — Auth: Supabase Auth with `@supabase/ssr`, cookie sessions — Accepted
- Email/password with verification; sessions in HttpOnly cookies.
- Route gating in **`proxy.ts`** (Next 16 renamed `middleware`; verified in `node_modules/next/dist/docs/.../version-16.md`), used for redirects only.
- Real authorization is enforced again in a server-side data-access layer and in RLS — `proxy.ts` is never the only check.
- GitHub sign-in (identity) stays separate from the GitHub App installation (repo access).
- Implemented in Stage 1: the DAL (`lib/auth/session.ts`) uses `auth.getUser()` (asks the Auth server, so revoked users are caught) and requires `email_confirmed_at`; `proxy.ts` uses `getClaims()` for the fast optimistic redirect. `connection()` keeps identity out of prerendered pages.
- Without public Supabase env vars: `development`/`demo` run on a labelled demo session; `staging`/`production` fail closed (redirect to `/login`, API 503 `auth_not_configured`).
- Public env vars are inlined at build time, so they must be present when the app is built (e.g. in Vercel's build environment).
- Until Stage 2 tables exist, scans are scoped by `owner_id` = the auth user id (in memory and in the legacy store).

## ADR-004 — Tenancy: `workspace_id` on every owned table, RLS via helper functions — Accepted
- Roles: owner / admin / developer / viewer in `workspace_members`.
- RLS policies call `SECURITY DEFINER` helpers (`is_workspace_member(ws)`, `has_workspace_role(ws, roles[])`) with a pinned `search_path`, avoiding recursive policy lookups.
- The service-role key is used only by workers and trusted server jobs, never in request handlers that act on behalf of a user; user requests use the user's JWT so RLS applies.
- No `USING (true)` on customer data. Cross-tenant tests are part of the migration's acceptance criteria.

## ADR-005 — Normalised scan schema replaces the JSON blob — Accepted
`vs_scans` (one JSONB row per scan) is kept read-only as legacy and removed after migration. New tables follow roadmap §5.1 (scans, scan_events, findings, finding_evidence, score_snapshots, …). Reconcile with existing `profiles`/`notifications` per ADR-002 instead of duplicating.

## ADR-006 — Job queue: Postgres-backed (`scan_jobs`, `FOR UPDATE SKIP LOCKED`) — Proposed
Avoids adding a vendor before one is needed; workers poll or are woken via Realtime. Revisit if throughput demands a dedicated queue. Worker host (Fly.io Machines per the original brief vs. alternatives) is decided at Stage 4.

## ADR-007 — Scanner honesty — Accepted · implemented in Stage 0.5
Until real Gitleaks / Semgrep / Tree-sitter / Postgres inspection run in workers, the in-process engine is reported as **"VibeShield static rules"**: no "full history", no "pg_policies inspection" claims, and `scanners` lists only what executed. `live-url` is omitted unless a probe actually ran. Each scanner run records `tool`, `version`, `status`, so partial results are distinguishable from clean ones.

## ADR-008 — Backend scoring service, versioned — Accepted
Scoring moves to a server module with `SCORE_FORMULA_VERSION`; every `score_snapshot` stores the version, inputs and per-finding contribution. Weights/penalties are documented assumptions (the brief defines none). A score never implies a verified badge: the badge has its own conditions (clean verification scan after merge, no open critical/high findings, scan fresh).

## ADR-009 — One provenance model — Accepted · core implemented in Stage 0.5 (`APP_ENV`, `DEMO_ALLOWED`; FinOps/Database/Context/Integrations fixtures gated in their own stages)
`DataOrigin` = `live` · `demo` · `unavailable` · `stale`, plus a deployment-level `APP_ENV` = `development | demo | staging | production`. Demo fixtures load only when `APP_ENV` is `development` or `demo`; in staging/production they are never imported into a response. The topbar environment pill reads the deployment's `APP_ENV`, not a workspace field.

## ADR-010 — "Connected" requires a verified connection record — Accepted
`isConnected()` becomes a lookup of a persisted integration row whose last verification call succeeded (and is recent). Env-var presence only means "configured". Action routes that cannot perform the action return 503/501, never `ok:true`.

## ADR-011 — Secrets — Accepted
Server env only for platform secrets. Per-workspace integration tokens (Supabase access tokens, etc.) are stored encrypted (Supabase Vault or app-level AES-GCM with a key from env), never readable by the browser role. GitHub App uses installation tokens minted per request; the private key lives only in worker/server env.

## ADR-012 — Testing — Accepted
Add Vitest for unit tests (scanner rules, scoring, diff, zod routes) and a SQL/RLS test suite run against a local or branch Supabase. Playwright is reserved for e2e of our own UI, separate from the customer-facing smoke-test feature. Gates: `tsc`, `lint`, `build`, tests.

## Assumptions
1. Brand, pricing and plan contents follow the roadmap §13; Team limits are not invented.
2. The roadmap's table list is a menu, not a mandate — tables are added in the stage that needs them.
3. Everything ships to a staging environment before production.




