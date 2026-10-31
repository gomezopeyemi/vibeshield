# VibeShield — Project Audit (Stage 0)

_Audited 2026-10-31 against commit `0270bf1` on `master` (working tree clean). Every claim below was checked in the code, by running the toolchain, or via a read-only inspection of the linked Supabase project. Secret values were not read or printed._

## 1. Baseline (measured)

| Check | Result |
|---|---|
| `npm install` | OK (`node_modules` was empty on arrival) |
| `npx tsc --noEmit` | **Clean** |
| `npm run build` | **Green** — 19 pages, 8 API routes |
| `npm run lint` | **8 errors, 11 warnings** (see §6) |
| Automated tests | **None** (no test runner, no test files) |
| CI (`.github/`) | **None** |
| Route protection (`proxy.ts`) | **None** |

## 2. Current architecture

Single Next.js 16.4.3 app (App Router, Turbopack), React 19.3, Tailwind v4, zod 4. No database client library: persistence is raw `fetch` to Supabase PostgREST in `lib/scan-store.ts`. No `@supabase/*`, Octokit, Stripe, Anthropic or Upstash dependencies are installed.

```
Browser (client components, demo session in providers.tsx)
   │  server components call lib/data.ts
   ▼
lib/data.ts ── live scan data (scan-store) ──else── lib/demo/* fixtures
   │
   ├─ lib/scanner.ts   regex/heuristic rules over files from lib/source.ts
   ├─ lib/scan-store.ts  one JSON-blob table public.vs_scans  (or process memory)
   └─ app/api/*          8 route handlers (2 real, 6 honest 503 stubs)
```

## 3. What is implemented (verified)

- **UI system and shell** — ~30 `components/ui/*` primitives, sidebar/topbar/⌘K, 12 routes, light-first tokens, no purple.
- **Scanner** — 9 rule families over real file contents; findings carry id (content hash), evidence snippet with redaction, pillar, severity, score delta, AI prompts per tool, diff.
- **Scan flow** — `GET /api/scan/stream` (SSE) and `POST /api/scan`, both against the bundled sample app only.
- **Scan history** — list / detail / compare, `diffScans`.
- **Honest stubs** — `/api/fix/pr`, `/api/finops/*`, `/api/stripe/test`, `/api/smoke`, `/api/context/sync` validate with zod and return 503 `not_connected`.
- **Generators** — fix prompts, SQL migration text, legal-doc drafts (client-side).

## 4. What exists only visually (or only as a fixture)

| Area | Reality |
|---|---|
| Auth, user, workspace, role | Hard-coded `DEMO_USER` / `DEMO_WORKSPACES` in `lib/demo/session.ts`; workspace switcher only changes client state |
| Environment indicator ("Production") | Value comes from the demo workspace fixture, not from deployment state |
| FinOps, Database map, Stripe, Smoke tests, Context sync, MCP, Integrations, PRs, Verification badge | `lib/demo/*` fixtures (labelled demo). Verification badge and PRs are demo **even when a live scan exists** |
| Settings, team, plan, billing | Static UI |
| Onboarding "Connect" | Only the sample target is scannable; `githubSource().load()` always throws |

## 5. Security and correctness risks (ranked)

**Critical — block any real-customer use**

1. **No authentication anywhere.** `POST /api/scan` and `GET /api/scan/stream` are open to the internet and run CPU work; `listRuns()` returns every scan globally. The moment real repos are scanned, any visitor can read them. (`app/api/scan/*`, `lib/scan-store.ts`)
2. **No tenant model.** `vs_scans` has no `workspace_id`/owner column, and the service-role key bypasses RLS, so tenancy would have to be enforced in app code that does not exist.
3. **"Connected" means "env var is set".** `isConnected()`/`requireIntegration()` (`lib/config.ts`, `lib/api.ts`) only test `process.env` presence. That violates the "never show connected without backend confirmation" rule. After the gate passes, `/api/fix/pr` returns `ok({created:false})` — an HTTP 200 `ok:true` for an action that did nothing.

**High**

4. **Scanner labels overstate what ran.** Events say "Secret scan (full history)", "Database inspection (pg_tables / pg_policies)", and the result lists `gitleaks`, `semgrep`, `tree-sitter`, `supabase`, `live-url` as scanners. In reality all are in-process regex rules over current file contents; there is no Git history scan, no AST, no live DB inspection, and `live-url` is skipped yet still listed in `scanners`. (`lib/scanner.ts` PHASES, lines ~446–544)
5. **Shared mutable state in `runScan`.** Module-level `seq` is reset per scan, so concurrent scans interleave event ids; `scanId` is `Date.now()` base-36, so two scans in the same millisecond collide. (`lib/scanner.ts:458-459`)
6. **Provenance is inconsistent.** `getFinding()` falls back to demo findings; `getScanEvents`, `getPullRequests`, `getVerification` ignore live scans. Overview can show a live score beside a demo verification badge. `DEMO_MODE = true` is a hard-coded client constant (`components/providers.tsx:21`) independent of `LIVE_MODE`.
7. **Scanning runs inside the web process.** Acceptable today (pure string matching, no execution of scanned code), not acceptable for real Gitleaks/Semgrep/Tree-sitter or untrusted repositories.
8. **No rate limiting or abuse controls** on any route; `liveUrl` is accepted by the scan schema and ignored (no SSRF defence exists because nothing probes yet — it must exist before anything does).

**Medium**

9. **Score is unversioned.** `score()` uses `PENALTY` / `PILLAR_WEIGHT` constants with a floor of 15; persisted scores carry no formula version, so historical comparisons break the day weights change.
10. **`diffScans` keys on line number** (known issue): moved code reads as resolved + introduced.
11. **`getRun()` checks process memory before the database**, so a stale in-memory copy can shadow the durable row.
12. **No error/loading/not-found boundaries** (`loading.tsx`, `error.tsx`, `not-found.tsx` absent) — failed server components surface Next's default error page.
13. **Documentation drift.** `README.md` says "all 6 screens live"; `IMPLEMENTATION_STATUS.md` §G still says "no persistence or auth".

## 6. Lint findings (8 errors)

| File | Rule |
|---|---|
| `app/(app)/scans/compare/page.tsx` :107–109 | `react-hooks/static-components` (components created during render) |
| `components/findings/ai-prompt.tsx` :20 | `react-hooks/set-state-in-effect` |
| `components/findings/fix-workspace-drawer.tsx` :48 | `react-hooks/set-state-in-effect` |
| `components/shell/command-menu.tsx` :68, :74 | `react-hooks/set-state-in-effect` |
| `components/ui/score-ring.tsx` :39 | `react-hooks/set-state-in-effect` |

Plus 11 `no-unused-vars` warnings (`code-block.tsx`, `diff-view.tsx`, `prompts.ts`, …). The `CLAUDE.md` working agreement lists only build and tsc as gates; lint must be added as a gate once these are fixed.

## 7. Supabase project `kowvnkydqqiaezqqejfr` (read-only inspection)

- **It is not a clean VibeShield project.** It already contains an unrelated app's tables — `designers`, `portfolio_items`, `projects`, `conversations`, `messages`, `consultations` (prices in NGN) — plus `profiles` and `notifications`, both names the roadmap also proposes for VibeShield.
- **Only one tracked migration** exists (`20261031095840 vibeshield_scan_history_v2`); the other tables were created outside migration history.
- `vs_scans`: RLS on, no policies (intentional deny-all; the advisor reports it as INFO), **1 row** — almost certainly the `scan_schema_check` test row from `CLAUDE.md` §6; not deleted by this audit.
- Security advisor: no other findings.
- Consequence: building the multi-tenant schema here would mix two products' data, auth users and migration history. See `ARCHITECTURE_DECISIONS.md` ADR-002 — **this needs a decision before Stage 1.**

## 8. Reusable as-is

Design system and shell; `lib/types.ts` contracts (to be extended, not replaced); scanner rules as the fast static layer (rename/relabel honestly); prompt generator; diff viewer; SQL generator; legal drafts; `lib/api.ts` `parse`/`fail`/`ok`; `DataBanner`/`StatusPill` provenance components; `scan-store` diff and view-model converters.

## 9. Must be built

Everything in roadmap Stages 1–12 except the pieces in §8: Supabase Auth and `proxy.ts`; tenant schema, RLS and tests; GitHub App; worker-based scanners; backend scoring service; Claude patching and PR lifecycle; FinOps/DB/Stripe backends; Playwright; MCP; billing; settings; production ops; and an automated test suite (none exists).
