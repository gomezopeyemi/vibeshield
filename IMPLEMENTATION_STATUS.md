# VibeShield — Implementation Status

_Stage 1: design system, global shell, and all six product screens on a typed
data layer with honest integration boundaries._
_Stage 2: a **real static-analysis scanner** that runs on real source files and
**streams real findings live** into the theater; the dashboard, score and fix
queue are now driven by real scanner output._

**Build:** `next build` ✓ passes · `tsc --noEmit` ✓ clean · 0 runtime console errors across all routes.

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
- **Verified:** real scan → 10 findings from 8 files, readiness 65, streamed over
  SSE; Overview/Fix show the Live pill with real paths & evidence.

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

- Data is demo fixtures; no persistence or auth yet.
- Relative timestamps (`timeAgo`) render on the client; minor hydration text
  variance is expected and harmless.
- Brand glyphs are simple monochrome marks, not official assets.
