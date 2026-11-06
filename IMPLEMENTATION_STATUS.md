# VibeShield — Implementation Status

_Stage 1: design system, global shell, and all six product screens on a typed
data layer with honest integration boundaries._
_Stage 2: a **real static-analysis scanner** that runs on real source files and
**streams real findings live** into the theater; the dashboard, score and fix
queue are now driven by real scanner output._

**Gates (2026-10-31, after Stage 1):** `npm run typecheck` ✓ · `npm run lint` ✓ 0 errors / 0 warnings · `npm test` ✓ 68 tests (8 files) · `npm run build` ✓. All four must stay green.

## Public homepage redesign (2026-11-06)

**Built**
- New `/` from the founder's spec. Purple palette, Instrument Serif + Inter, scoped to `app/(marketing)` (`--mk-*` tokens); the product app keeps its blue system.
- New header with dropdowns and a Resources mega-menu (Radix NavigationMenu) plus a mobile menu. New footer. Both apply to every marketing page.
- Hero: pre-baked wavy dot texture (`scripts/gen-hero-dots.mjs`; a live SVG-filter version sits behind `BRAND.heroTexture`), an email box that opens `/signup` with the address prefilled (validated server-side), and an autoplaying product illustration labelled "Illustration". It runs only while half in view and stays still under reduced motion.
- Sticky tool-name strip, scroll-driven page colour (`background-observer.tsx`), skeleton→content cards, a typed-out answer mock, a snap carousel of checks with real statuses, persona cards, resources, final CTA.
- All copy, nav and section themes live in `lib/brand.ts`.
- **Deliberate deviations from the spec (honesty rules):** CTA is "Get started" → sign-up (no demo programme exists). No "trusted by 16,000" count: the strip lists tools we support. Compliance-framework cards replaced by what VibeShield actually checks. No compliance seals. "Partners" omitted. Unbuilt resources are shown as "Soon", not linked. Social icons render only once URLs are set.

**Verified**
- Real headless Chrome driven over CDP at 1440×900 and 390×844, scrolling through the page: every section, the colour sequence, the sticky strip, all 8 demo steps incl. cursor press, the mega-menu rail swap, the mobile layout. No horizontal overflow at either width. Found and fixed: invalid `calc()` in the carousel gutter, and a colour-observer miss on fast scroll jumps (now measures which section is under the midline).
- Gates: typecheck ✓ · lint ✓ · 147 tests ✓ · build ✓. `/`, `/features`, `/pricing`, `/terms`, `/privacy` 200.

**Iteration 2 (same day, founder asked for a finished look with stand-in assets)**
- Stand-in artwork: 8 unDraw illustrations recoloured to the palette (Built for, Resources, final CTA) and 10 Simple Icons (CC0) tool logos in the strip. Sources and licences in `public/marketing/ASSETS.md`; swap by file name or in `lib/brand.ts`.
- New "From prompt to production" section: the six-step loop from `lib/marketing.ts`, each with its real status.
- `/features`, `/pricing`, `/terms`, `/privacy` restyled to the marketing design (serif titles, pill buttons, shared `StatusTag`/`PageIntro`); wording unchanged.
- **App-wide CSS fix:** the global `* { border-color }` and heading `letter-spacing` rules in `globals.css` were unlayered, so they silently overrode every `border-*` colour and `tracking-*` utility (e.g. the "current plan" outline never showed). Moved into `@layer base`. App pages checked in the demo session (overview, fix, settings): colours now show as authored.

**Not verified**
- Lighthouse score; real-device touch scrolling; Safari.

## Stage 2 — Multi-tenant database (IN PROGRESS)

### Slice 1 — identity, workspaces, roles (written + tested locally, 2026-11-01 · NOT applied to Supabase yet)

**Built**
- `supabase/migrations/20261101000100_identity_workspaces.sql`: `profiles`, `workspaces`, `workspace_members`, enum `workspace_role` (owner / admin / developer / viewer).
- RLS on all three tables via `SECURITY DEFINER` helpers in a non-exposed `private` schema (`is_workspace_member`, `has_workspace_role`, `workspace_role_of`, `shares_workspace_with`), `search_path = ''`, no `USING (true)`.
- Explicit privileges: Supabase's default ALL grants are revoked; `anon` gets nothing; column-level `UPDATE` grants (users can rename a workspace but never change its `plan`, which is reserved for billing).
- `create_workspace(name, slug)` creates the workspace and its owner membership atomically.
- Sign-up trigger: every new auth user gets a profile (name from sign-up metadata), a `Personal` workspace and an owner membership.
- Membership guard trigger: nobody changes their own role or removes themselves; only owners manage owners; a workspace always keeps at least one owner. Account deletion removes memberships and drops the user's now-empty workspaces.
- `WorkspaceRole` / `WorkspaceMember` added to `lib/types.ts`.

**Verified**
- `tests/db/` runs the migration on a real Postgres 18 (PGlite, in-process) with Supabase's roles, `auth.users`, `auth.uid()` and default grants recreated. 17 tests: RLS everywhere, anon locked out, sign-up bootstrap, cross-workspace isolation, each role's permissions, owner rules, plan protection, profile edits, account deletion.
- Mutation check: making workspaces world-readable fails 3 tests; dropping the grant revokes fails 3 tests.
- Gates: typecheck ✓ · lint ✓ · 97 tests ✓ · build ✓.

**Not verified**
- Not applied to the real project (`zwowuzkxgsvpfcymysca`): the Supabase connector cannot reach it. PGlite stubs Supabase's `auth` schema, so behaviour on the hosted database still needs a check after applying.
- Not wired into the app yet: the shell still uses the placeholder "Personal" workspace and scans are still stored per user in memory.

### Slice 2 — app wiring for workspaces (code complete, 2026-11-05 · live check blocked on applying migrations)

**Built**
- Migration `20261105000100_backfill_and_profile_link.sql`: backfills a profile + Personal workspace + owner membership for accounts created before slice 1 (including the founder's existing account); links `workspace_members.user_id` → `profiles` so the roster can show names.
- `lib/workspaces/data.ts` (DAL, runs as the user so RLS decides): `getWorkspaceContext()` returns `ready` / `demo` / `not_provisioned` / `error`, with every row validated by zod; `listMembers()`.
- `lib/workspaces/actions.ts`: `createWorkspace` (via `create_workspace()`), `switchWorkspace` (only to a workspace the DB shows the caller; stored in an httpOnly cookie), `renameWorkspace` (zero rows updated ⇒ "only owners and admins"). Postgres errors are translated (taken slug, check failure, permission, schema missing). `refresh()` re-renders after each change.
- UI: real workspace switcher with roles; working **New workspace** dialog with slug suggestion; Settings shows a rename form for owners/admins (read-only with an explanation otherwise) and the **real team roster**. "Delete workspace" is disabled ("coming soon") instead of showing a notice.
- Honest states: without the tables, the app keeps a temporary Personal workspace and shows a banner saying workspaces aren't set up; "New workspace" says "needs setup". The demo session keeps its fixtures and never touches the database.

**Verified**
- 21 new tests (118 total): 3 DB tests for the backfill + roster join; 18 app-layer tests (state detection, cookie selection ignoring foreign ids, demo isolation, validation before any DB call, error translation, RLS zero-row handling).
- The live project returns `PGRST205` (missing table) and `PGRST202` (missing function), exactly the codes used to detect "not set up".
- Gates: typecheck ✓ · lint ✓ · 118 tests ✓ · build ✓. Production server: public pages 200, app pages 307 → login, API 401, clean log.

**Not verified**
- Signed-in UI with real workspaces: needs the two migrations applied to `zwowuzkxgsvpfcymysca` and a verified account. Switcher, dialog and Settings were not checked in a browser.

### Slice 3 — workspace-owned scan history (code complete, 2026-11-06 · live check blocked on applying migrations + secret key)

**Built**
- Migration `20261106000100_scans.sql`: `scans`, `findings`, `scan_events`, `score_snapshots`, all keyed by `workspace_id`. Child rows reference `(workspace_id, scan_id)`, so a finding can't claim another workspace's scan. Deleting a workspace removes its history; deleting an account keeps its scans (`created_by` → null).
- **Members read, nobody writes.** RLS lets every member (viewers included) read their workspace's history; `authenticated` has `SELECT` only, so no user can forge a scan or a score, owners included. Results are written by `public.record_scan(jsonb)`, executable only by `service_role`. It re-checks that the author is an owner/admin/developer and writes scan + findings + events + snapshot in one transaction.
- Score snapshots store `formula_version` (`SCORE_FORMULA_VERSION` in `lib/scanner.ts`, ADR-008). Only a completed scan gets a snapshot; a failed scan never reads as a score.
- `lib/supabase/admin.ts`: server-only secret-key client (`SUPABASE_SECRET_KEY`, legacy name `SUPABASE_SERVICE_ROLE_KEY` accepted); a publishable key in that slot is detected and refused. Used only for `record_scan`.
- `lib/scan-scope.ts`: the current workspace (from the RLS-verified context) and whether the user may scan. Scan routes return **403 `forbidden`** to viewers, and the onboarding and Re-scan buttons are disabled for them with an explanation.
- `lib/scan-store.ts` rewritten. Reads go through the user's session (RLS). Lists carry summaries only, and findings/events load per scan. **A failed read throws** and pages say "couldn't be loaded" instead of "no scans yet"; a missing table names the migration to apply. Writes that can't reach the database (no workspace tables, no secret key, write error) fall back to memory, **scoped to the workspace / user**, with the reason shown. Each scan carries `persisted`, so "Not saved" banners are per scan.
- The legacy `vs_scans` code path is gone. The old table still exists in the *old* project (`kowvnkydqqiaezqqejfr`, not this app's database) and can be dropped there.

**Verified**
- 14 DB tests (PGlite): anon locked out; no user can insert/update/delete or call `record_scan`; atomic write; viewers/outsiders/null author refused with nothing written; bad finding rolls back the whole scan; no snapshot for failed scans; repeated finding hashes kept; members (incl. viewers) read, outsiders see nothing; personal workspaces private; child rows pinned to their workspace; removed members lose access; cascade + author deletion.
- Mutation check (SQL): viewer allowed to scan, `authenticated` granted `record_scan`, always-true read policy, child FK without workspace, snapshot for failed scans. **Each is caught.**
- 15 app tests: payload sent to `record_scan` (workspace, author, formula version, no score unless completed); every fallback and its reason; non-workspace scopes never hit the DB; **full round trip through the PostgREST row shape returns the identical scan**; reads are filtered to the current workspace; read errors and malformed rows throw; the data layer reports them as unavailable; the missing-migration message; viewers get 403 from both routes before the scanner runs.
- Mutation check (TS): always sending a score, dropping the workspace filter, swallowing read errors, unscoped memory, no viewer guard on the stream, ignoring `durable`. **Each is caught.**
- Gates: typecheck ✓ · lint ✓ · **147 tests** ✓ (14 files) · build ✓. No secret-key name, `record_scan` or `sb_secret_` string in the client bundle. Production server: public 200, app pages 307 → login, API 401. The live project returns `PGRST205` for `scans` (not applied yet).

**Not verified**
- Nothing against the hosted database: the three migrations aren't applied to `zwowuzkxgsvpfcymysca` and no secret key is set, so every scan there still lands in memory (and says so). Not checked in a browser.

**To turn it on**
1. SQL Editor: run, in order, `20261101000100_identity_workspaces.sql`, `20261105000100_backfill_and_profile_link.sql`, `20261106000100_scans.sql`.
2. Project Settings → API Keys → create a **secret** key; put it in `.env.local` as `SUPABASE_SECRET_KEY=` (never `NEXT_PUBLIC_`, never committed). Restart the dev server.
3. Run a scan, then restart the server: `/scans` should say "History is saved to this workspace" and still list it.

**Next slice**
4. Invitations and member management (role changes, removal), audit log, Realtime for scan events.

## Stage 1 — Public site & authentication (CODE COMPLETE, 2026-10-31 · live verification pending)

**Not "done" until the live journey below passes against the real VibeShield Supabase project.** No keys were available this session (by decision ADR-002 the founder creates the project and owns the keys).

**Built**
- **Public site** `app/(marketing)`: `/` landing, `/features`, `/pricing`, `/terms`, `/privacy`. Every capability carries a status (Available / Preview / In development) from one source, `lib/marketing.ts`. Paid plans show "Coming soon" (disabled, no fake checkout). Terms/Privacy are marked **Draft — pending legal review**; contact details are not published yet. `app/page.tsx` (redirect to `/overview`) was removed.
- **Auth pages** `app/(auth)`: `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email`; `app/auth/confirm` handles email links (token_hash and PKCE code). Forms use Server Actions + `useActionState`, zod validation, field errors, pending states.
- **Server Actions** `lib/auth/actions.ts`: sign up (with email verification), sign in (safe `next`), resend verification, request reset, update password, sign out. Generic messages for bad credentials; identical replies for reset/resend whether or not the account exists; rate-limit and **service-outage** messages are distinct from credential errors.
- **Session layer** `lib/auth/session.ts` (DAL): `getSession` (Auth server `getUser`, requires verified email, `connection()` so identity is never prerendered), `requireUser` (pages/data), `requireApiUser` (routes → 401/503 JSON).
- **`proxy.ts`**: session refresh + optimistic redirect; **default-deny** (every non-public path needs a session; `next` param preserved; open-redirect guard `safeNext`).
- **Enforcement**: all 11 data-layer getters, the 3 scans pages, the `(app)` layout and **all 8 API routes** check the session. Scans are now **owned** (`owner_id` = auth user id): one account cannot list, open, diff or read events of another's scans.
- **Shell**: real name/email in the topbar and Settings; working Sign out; real accounts get a placeholder "Personal" workspace with no repositories (no fixtures). "New workspace" is disabled until Stage 2. A visible banner marks the demo session.
- **Config safety**: a secret / service-role key placed in `NEXT_PUBLIC_*` is detected and auth refuses to run with it. `.env.example` documents all variables.
- **Modes**: no public Supabase env → `development`/`demo` use a labelled demo session; `staging`/`production` fail closed.

**Verified (this session)**
- Gates: typecheck ✓ · lint ✓ (0/0) · **68 tests** ✓ (8 files: routes, schemas, key detection, session/DAL, proxy, all 8 API routes return 401 before parsing, Server Actions incl. outage/enumeration/redirect, scan ownership) · build ✓.
- Runtime (production server + curl), three builds:
  - *production, auth unconfigured*: public pages 200; `/overview`, `/scans`, `/settings` → 307 `/login`; API → 503 `auth_not_configured`; login form disabled with notice.
  - *demo, auth unconfigured*: app pages 200 with the demo banner; env pill `demo`; scan works.
  - *auth configured (placeholder `.invalid` project)*: protected pages → 307 `/login?next=…` (query preserved, unknown routes included); **forged auth cookie rejected**; API → 401; `/auth/confirm` with a bad token or `next=https://evil.test` → `/login?error=link_invalid`; login form enabled and shows the link-expired notice.

**Not verified**
- The real sign-up → email → verify → login → refresh → logout → reset journey (needs the real project + inbox).
- Visual/browser pass: no browser tooling could reach a local server this session. Pages were checked via HTML only.

**Live project wiring (verified 2026-10-31)**
- Project `zwowuzkxgsvpfcymysca` (dedicated, per ADR-002). `.env.local` holds the publishable key + `NEXT_PUBLIC_SITE_URL`; server-only `SUPABASE_*` deliberately unset (no `vs_scans` table there, so scan history stays in memory).
- Read from the project's own `/auth/v1/settings`: email provider on, `disable_signup: false`, **`mailer_autoconfirm: false`** (verification required). Key validated (200 with it, 401 with a wrong one).
- With auth live: protected routes 307 → `/login?next=…`, API 401 `unauthorized` (not 503), login form enabled, demo session correctly suppressed, no `@supabase/ssr` cookie warnings in the server log.

**Known issue — email confirmation links (open)**
A real sign-up succeeded, but `/auth/confirm?code=…` failed → `/login?error=link_invalid`. Supabase's **default** email template sends a PKCE `code`, which only works in the browser that signed up and is consumed if a mail client pre-fetches the link (Gmail does). Fix is a dashboard change, step 4 below (`token_hash` + `verifyOtp`, already supported in the route and browser-independent). Mitigations shipped: `/verify-email` now has a **sign-out escape hatch** (an unverified session otherwise cannot reach the shell's sign-out, so it was a dead end), a clearer `link_invalid` message, and a "Send a new link" link on `/login`.

**Your setup checklist**
1. ✅ Project created.
2. ✅ Confirm email ON (verified via the settings endpoint).
3. Authentication → URL Configuration: Site URL `http://localhost:3000`; add redirect URL `http://localhost:3000/auth/confirm` (add the Vercel URL at deploy time). **Not verifiable from here — the Management API is out of scope for the connector.**
4. **Required for reliable links** — Authentication → Emails → Templates:
   - *Confirm signup*: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/overview`
   - *Reset password*: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`
5. ✅ `.env.local` populated.
6. Optional: enable Google sign-in (below).

**Google (Gmail) sign-in — code complete, provider not yet enabled**
- `signInWithGoogle` action + `GoogleButton`; callback reuses `/auth/confirm` (OAuth `code` → `exchangeCodeForSession`); cancelled/failed handshakes map to distinct `oauth_cancelled` / `oauth_failed` messages instead of "invalid link".
- The button renders **only when the project really has Google enabled** (`lib/supabase/providers.ts` reads `/auth/v1/settings`, caches 5 min, fails closed) — no dead button. Your project reports `google: false`, so it is currently hidden, as verified on `/login` and `/signup`.
- Identity only; unrelated to the future GitHub App repo authorisation. OAuth emails arrive provider-verified, so they skip `/verify-email`.
- To enable: Google Cloud Console → OAuth client (Web) with redirect `https://zwowuzkxgsvpfcymysca.supabase.co/auth/v1/callback`, then Supabase → Authentication → Sign In / Providers → Google: paste client ID + secret. The button then appears by itself.

**Known gaps carried forward**
- Workspaces, roles and durable scan storage: built in Stage 2 slices 1–3 (see above), pending application to the live project.
- Profile editing, account deletion, sessions list → Stage 11. Default Supabase email sender is rate-limited; custom SMTP before launch (D3).
- `PLANS` (Team) lists "SSO & audit exports" and "Priority remediation", which the roadmap doesn't specify; review before launch.
- FinOps/Database/Smoke/Context pages still show labelled fixtures to every account (Stages 7/8).

## Stage 0.5 — Foundation hardening (DONE, 2026-10-31)

- **Lint:** the 8 `react-hooks` errors and 11 warnings are fixed (state derived during render instead of set in effects; `Group` moved out of the compare page's render; unused imports removed). ESLint now ignores `_`-prefixed and rest-sibling vars.
- **Tests:** Vitest 5 added (`npm test`; `@types/node` bumped to ^22 for its peer range). 23 tests: scanner on the sample app, score(), `diffScans`, `parse()`/`notImplemented()`, `APP_ENV`, and data-layer provenance. Includes a 5-way concurrent-scan test.
- **Scanner honesty (ADR-007):** the engine is now "VibeShield static rules". Findings and events use scanner `static-rules`; no more "full history", `pg_policies`, Gitleaks/Semgrep/Tree-sitter or `live-url` claims; the theater lists what is not enabled yet. Detection itself is unchanged (verified identical output vs. the original on the sample: 9 findings, score 68). Demo fixtures still use the old tool names and remain labelled demo.
- **`runScan` fixes:** event sequence is per-scan (was a shared module counter); `scanId` has a random suffix (was millisecond time only).
- **Provenance (ADR-009):** `APP_ENV` (`VIBESHIELD_ENV`: development | demo | staging | production; unset → development locally, **demo** in a production build) drives the topbar pill and Settings; `Workspace.environment` and the hard-coded `DEMO_MODE` are gone. The data layer serves fixtures only when `DEMO_ALLOWED`, `VIBESHIELD_LIVE` is off, and no real scan exists; otherwise it returns `unavailable`. With a real scan, PRs and the verification badge no longer fall back to demo data.
- **No fake success:** the six stub routes (`/api/fix/pr`, `/api/finops/rate-limit`, `/api/finops/kill-switch`, `/api/stripe/test`, `/api/smoke`, `/api/context/sync`) now return `501 not_implemented` after the integration gate, instead of `200 ok:true`.
- **Boundaries:** added `app/error.tsx`, `app/not-found.tsx`, `app/(app)/loading.tsx`.
- **Verified at runtime** (production server, curl): pages return 200; topbar shows `demo` for an unconfigured build and `production` when set; Overview with no scan in `production` is unavailable (no fixtures); after `POST /api/scan` Overview flips to Live with no demo banner; SSE events carry `static-rules`.
- **Not verified:** no browser/visual pass (no browser tooling used this stage); Supabase read/write path (no env vars); `live-scan-theater` rendering in a real browser.
- **Known gaps carried forward:** FinOps, Database, Smoke/Context, Integrations pages still serve labelled fixtures regardless of `APP_ENV` (they need typed empty states; done with their real backends in Stages 3/7/8) — so **do not deploy as `staging`/`production` before then**. "Connected" is still env-var presence (ADR-010, Stage 3). `DataBanner` shows a generic message for `unavailable` and ignores `note`. Earlier docs said the sample yields 10 findings / score 65; the actual current output is 9 / 68.
- **Exact next action:** done → see Stage 1 above.

## Stage 0 — Audit (DONE, 2026-10-31)

- **Done:** full repo audit; `PROJECT_AUDIT.md`, `VIBESHIELD_BUILD_PLAN.md`, `ARCHITECTURE_DECISIONS.md` created; this file refreshed. Read-only inspection of the linked Supabase project. No application code changed.
- **Verified:** `npm install`, `tsc`, `build`, `lint` run locally; Supabase tables, migrations and advisors read via the Supabase connector; Next 16 `proxy.ts` convention confirmed in the bundled docs.
- **Not verified:** the app's own Supabase read/write path (no env vars set locally); runtime browser behaviour (no UI work in this stage).
- **Key findings:** no auth or tenancy anywhere; "connected" = env var present; scanner labels claim full-history/pg_policies/gitleaks/semgrep/tree-sitter though all are in-process regex rules; shared mutable `seq` in `runScan`; demo and live data mixed on Overview; the Supabase project holds an unrelated app's tables.
- **Blocking decision:** D1 — dedicated Supabase project for VibeShield (see `ARCHITECTURE_DECISIONS.md` ADR-002).
- **Exact next action:** Stage 0.5 (done above), then Stage 1 after D1.
- **Open item still pending:** test row `scan_schema_check` in `public.vs_scans` (1 row present; not deleted).

## Stage 3 — durable scan history & richer Scans pages (NEW)

- **Persistence** (`lib/scan-store.ts`): scans are written to a Supabase table
  `public.vs_scans` (migration `vibeshield_scan_history`) through PostgREST with a
  **server-only** `SUPABASE_SERVICE_ROLE_KEY`. RLS is on with **no policies** and
  `anon`/`authenticated` privileges revoked, so browsers can't read or write it.
- **Honest fallback:** without `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (or if a
  write fails) scans live in server memory and the UI says so ("not durable").
  Nothing claims to be saved when it isn't.
- **Pages:** `/scans` (score trend, status filters, per-scan score, links),
  `/scans/[id]` (pillars, findings, full event log), `/scans/compare`
  (introduced / resolved / unchanged findings + score & pillar deltas).
  Findings are matched across scans by content-hash id (rule + file + line).
- **Not verified end-to-end from the sandbox:** the sandbox network blocks
  `*.supabase.co`, so the app's PostgREST calls were not exercised against the live
  table here. The schema was verified via the Supabase connector instead.

### To turn persistence on
Set in `.env.local` (and on the Vercel project) — never in a `NEXT_PUBLIC_*` var:

```
SUPABASE_URL=https://kowvnkydqqiaezqqejfr.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role key from Supabase → Project Settings → API>
```

## Stage 2 — the real scanner (NEW)

A dependency-free analyzer (`lib/scanner.ts`) in the spirit of Gitleaks /
Semgrep / Tree-sitter / Supabase inspection. It reads real files from a source
provider (`lib/source.ts`) and produces **real** findings, line numbers, code
snippets and a computed readiness score — no fixtures.

- **Real detections:** exposed `NEXT_PUBLIC_*_SERVICE_ROLE`, hardcoded secrets
  (`sk_live_…`, `sk-…`, `AKIA…`), Stripe webhook missing `constructEvent`,
  unprotected paid API routes (no auth / no rate-limit), infinite `useEffect`
  loop (effect sets a state that is in its own deps), disabled RLS / `USING(true)`
  policies in SQL, >2,000-line monoliths, missing security rules.
- **Real scoring** (`score()`): per-pillar penalties → a weighted-blend overall.
- **Live streaming:** `GET /api/scan/stream` (SSE) runs a real scan and emits
  each event as it happens; the Live Scan Theater renders them in real time.
  `POST /api/scan` runs the same scan non-streamed and persists it.
- **Persistence:** `lib/scan-store.ts` holds results for the session; the data
  layer (`getReadiness`/`getFindings`/`getScans`) serves **origin: "live"** once
  a scan has run, and Overview / Fix / Scans flip from demo → real automatically.
- **Target:** the sandbox gateway blocks `api.github.com` and brokers GitHub
  access per-repo, so the scanner runs against a bundled, intentionally-vulnerable
  **`samples/vulnerable-app/`** (8 real files incl. a 2,468-line monolith),
  clearly labeled. The GitHub source provider is implemented for when a repo is
  reachable/connected — it fails honestly otherwise.
- **Verified:** real scan → 9 findings from 8 files, readiness 68 (re-measured in
  Stage 0.5; earlier notes said 10 / 65), streamed over SSE; Overview/Fix show the
  Live pill with real paths & evidence. _The Gitleaks/Semgrep/Tree-sitter wording
  above describes inspiration, not tooling — see Stage 0.5, scanner honesty._

---

## A. Starting point

There was **no existing repository** in this environment (`/home/user` was empty).
This is a fresh scaffold: **Next.js 16 (App Router) · React 19 · TypeScript ·
Tailwind v4 · Framer Motion · Radix primitives · Geist**. No purple anywhere;
light-first, restrained blue accent, status colors reserved for status.

## B. What is fully built (UI + behavior)

| Screen | Route | State |
|---|---|---|
| 1 · Onboarding & Live Scan Theater | `/onboarding` | ✓ Connect flow (GitHub/repo/URLs/Supabase), animated event-replay theater |
| 2 · Command Center Dashboard | `/overview` | ✓ Readiness score ring, history chart, 4 pillars, fix queue, verification badge |
| 3 · Interactive Fix-It Workspace | `/fix` + drawer | ✓ 3-part findings, diff viewer, AI prompt customizer, PR flow, history |
| 4 · Denial-of-Wallet & FinOps | `/finops` | ✓ Loop graph, unprotected routes, rate-limit form, kill switch |
| 5 · Database & Stripe Integrity | `/database` | ✓ Schema topology + inspector + SQL migration gen, Stripe flow + webhook tester |
| 6 · Smoke Tests & AI Context Sync | `/smoke-tests`, `/context-sync` | ✓ Playwright theater, context files + MCP + legal generators |
| + Repository Scans | `/scans` | ✓ Scan history list |
| + Integrations | `/integrations` | ✓ Connection cards (honest states) |
| + Settings | `/settings` | ✓ Account, workspace, plan/entitlements, team, danger zone |

All five technical modules (A Security · B FinOps · C Revenue/Stripe · D
Playwright · E Context/Compliance) are represented and intact.

**Also built:** collapsible sidebar + topbar shell, ⌘K command palette, workspace/repo
selectors, responsive layouts (desktop/tablet/mobile), full typed entity layer
(`lib/types.ts`, ~20 entities), zod-validated action API routes, loading/empty/
disconnected/error states, `DataBanner` provenance labels, legal-doc generators.

## C. Honesty model (per spec §13) — NO fake buttons

- The app runs in **DEMO mode** (`DEMO_MODE`/`LIVE_MODE`). Every demo region is
  flagged with an `origin: "demo"` pill + banner. Nothing claims to be live.
- **Action endpoints are real boundaries.** `POST /api/scan`, `/api/fix/pr`,
  `/api/finops/rate-limit`, `/api/finops/kill-switch`, `/api/stripe/test`,
  `/api/smoke`, `/api/context/sync` validate input (zod) and return an honest
  `503 not_connected` with remediation. They **never fake success** and mutate nothing.
- **Kill switch** is only "armed" when the backend confirms it (`confirmedByBackend`).
- **Verification** is never implied by score alone.
- **Demo PRs** are labeled as illustrative; new PRs require the connected GitHub App.
- **Legal drafts** are generated client-side and labeled "DRAFT — requires review."

## D. Awaiting credentials / backend (the real integrations)

These are stubbed at the data layer (`lib/data.ts`) and API routes with `TODO(live)`
markers. Each returns an honest unavailable state until wired:

- **GitHub** OAuth + GitHub App (repo retrieval, Auto-Fix PRs via Octokit)
- **Supabase** Management API (pg_tables/pg_policies live inspection) + Realtime (scan events)
- **Scanner workers** (Gitleaks, Semgrep OSS, Tree-sitter, Nuclei) on isolated runners
- **Claude API** patch generation for Auto-Fix PRs
- **Stripe** (restricted key) for sandboxed webhook tests
- **Vercel** + **Playwright** workers for smoke runs; CI deploy gatekeeper
- **Upstash Redis** for rate-limit middleware + spend kill switch
- **Provider billing** (OpenAI/Anthropic/ElevenLabs/Replicate/Resend) for spend telemetry
- **MCP server** package `@vibeshield/mcp`

## E. Security posture of this app

No service-role keys in the client; action routes validate input; honest
not-connected responses; secrets redacted in all code previews; `server-only`
guards the data layer. (Auth, workspace-ownership checks, SSRF protection for
user-supplied URLs, and audit logging are backend work for the live stage.)

## F. Recommended next stage

**Stage 2 — wire Phase-1 integrations:** GitHub + Supabase OAuth, real scan
enqueue + Supabase Realtime event stream into the Live Scan Theater, and live
Launch Readiness scoring. Flip `VIBESHIELD_LIVE=1` and the data layer switches
from demo fixtures to live calls at the already-defined boundaries.

## G. Known limitations

- Scan history can persist (Stage 3 above, unverified end to end); everything else is demo fixtures. There is **no auth, user, workspace or tenancy** — the session is a hard-coded demo user.
- Relative timestamps (`timeAgo`) render on the client; minor hydration text
  variance is expected and harmless.
- Brand glyphs are simple monochrome marks, not official assets.
