# VibeShield — Implementation Status

_Stage 1: design system, global shell, and all six product screens on a typed
data layer with honest integration boundaries._
_Stage 2: a **real static-analysis scanner** that runs on real source files and
**streams real findings live** into the theater; the dashboard, score and fix
queue are now driven by real scanner output._

**Gates (2026-10-31, after Stage 0.5):** `npm run typecheck` ✓ · `npm run lint` ✓ 0 errors / 0 warnings · `npm test` ✓ 23 tests (4 files) · `npm run build` ✓. All four must stay green.

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
- **Exact next action:** Stage 1, blocked on decision D1 (dedicated Supabase project).

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
