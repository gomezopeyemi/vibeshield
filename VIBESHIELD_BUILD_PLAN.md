# VibeShield — Build Plan

Dependency-ordered. Each stage is **finished** only when its acceptance criteria pass and `tsc`, `lint`, `build` and that stage's tests are green. We work one stage at a time. Source: `VibeShield_Full_SaaS_Development_Roadmap.md`; findings behind the ordering are in `PROJECT_AUDIT.md`.

```
S0 audit ─▶ S1 auth ─▶ S2 tenant DB ─▶ S3 integrations ─▶ S4 scanning ─▶ S5 dashboard/score
                                                                              │
          S10 billing ◀─ S9 MCP/legal ◀─ S8 guardian ◀─ S7 finops/db/stripe ◀─ S6 fix/PR
                 └────────────▶ S11 settings/ops ─▶ S12 production
```

## Stage 0 — Audit ✅
Deliverables: `PROJECT_AUDIT.md`, this plan, `ARCHITECTURE_DECISIONS.md`, refreshed `IMPLEMENTATION_STATUS.md`. Baseline measured.

## Stage 0.5 — Foundation hardening ✅ (done 2026-10-31; see IMPLEMENTATION_STATUS.md)
Needed because later stages assume them.
- Fix the 8 lint errors and 11 warnings; add `npm run lint` and `npm test` to the working agreement.
- Add Vitest; first tests: `score()`, `diffScans`, scanner rules on the sample app, `parse()`.
- Fix `runScan` shared `seq` and `scanId` collision; relabel scanner events/`scanners` per ADR-007.
- Add `loading.tsx` / `error.tsx` / `not-found.tsx`.
- Introduce `APP_ENV` + single provenance model (ADR-009); remove hard-coded `DEMO_MODE`.
- **Accept:** lint 0 errors, tests green, concurrent-scan test passes, no UI string claims a tool or history scan that did not run.

## Stage 1 — Public site and authentication — code complete; live verification pending your Supabase project
- **Needs:** ADR-002 decision (decided: dedicated project, keys supplied by the founder).
- Landing, features, pricing, terms, privacy (copy describes only what exists, with roadmap labelling).
- Supabase Auth: signup, email verify, login, logout, forgot/reset password, `proxy.ts` gating, server-side session check in a data-access layer, callback route.
- `/api/scan*` require a session.
- **Accept:** full journey register → verify → login → persist session → logout → recover → login, tested; unauthenticated API calls return 401; protected pages redirect.

## Stage 2 — Multi-tenant database — in progress (slice 1: identity/workspaces/roles written and tested locally)
- Versioned SQL migrations committed in `supabase/migrations`; identity, workspace, membership, invitations, repositories, scans, scan_events, findings, evidence, score_snapshots, audit_logs first; later domains arrive with their stage.
- Helper functions, RLS on every table, role matrix, Realtime publication for `scan_events`.
- Data-access layer scoped by workspace; retire `vs_scans`.
- **Accept:** RLS test suite proves cross-workspace reads/writes fail for each role; migrations apply cleanly from empty; relationship diagram committed.

## Stage 3 — Integrations and onboarding
GitHub App (install, callback, installation tokens, repo + branch selection, webhooks), Supabase connection verification, URL submission with SSRF guard, real Integrations page driven by verified records (ADR-010), workspace creation checklist.

## Stage 4 — Scanning infrastructure
Job queue (ADR-006), isolated worker, Gitleaks (incl. history), Semgrep rules, Tree-sitter analysis, Supabase RLS inspection, normalised findings with evidence + redaction, scan states (queued → … → cancelled), refresh-safe realtime. `githubSource()` becomes real.

## Stage 5 — Real dashboard and scoring
Backend scoring service (ADR-008), score history, pillars, severity distribution, points-to-gain, independent verification-badge conditions, rescan.

## Stage 6 — Fix Workspace and auto-remediation
Findings API, filters, Claude prompt/patch generation with secret redaction, diff validation, user-approved PR creation via installation token, PR/check tracking, merge confirmation, verification rescan. Never auto-merge.

## Stage 7 — FinOps, Database, Stripe
Route/provider detection persisted, Upstash rate limits, spend limits and kill switch with backend confirmation, real DB topology from inspection runs, policy-aware migration generator, Stripe webhook audit and controlled tests (customer's Stripe, not ours).

## Stage 8 — Guardian
Playwright workers + artifacts, CI/GitHub-check gate, rules-file sync (`.cursorrules`, `.windsurfrules`, `CLAUDE.md`), context analysis.

## Stage 9 — MCP and compliance
MCP server package, auth, heartbeat, validation events; legal/GDPR artifacts marked draft.

## Stage 10 — Billing
VibeShield's own Stripe subscriptions (kept separate from the customer-audit Stripe code), plans per roadmap §13, webhooks, portal, server-enforced entitlements, usage limits.

## Stage 11 — Settings and operations
Profile, sessions, members/roles/invites, integration permissions, audit log UI, billing/usage, notification preferences and delivery.

## Stage 12 — Production
Env separation, CI/CD, migration deploys, worker deploy and health checks, monitoring, backups + restore drill, retries, rate limits, domain/HTTPS, security review.

## Decisions needed from you
| # | Decision | Needed by | Recommendation |
|---|---|---|---|
| D1 | Supabase project for VibeShield (ADR-002) | Stage 1 | ✅ Decided: new dedicated project, created by the founder |
| D2 | Worker host (Fly.io Machines vs other) | Stage 4 | Fly.io, per original brief |
| D3 | Auth email sender | Stage 1 staging | Supabase default for dev; custom SMTP before launch |
| D4 | Production domain / app name | Stage 12 | — |

## Immediate next action
Finish Stage 1 verification once the VibeShield Supabase project's keys are in `.env.local` (see IMPLEMENTATION_STATUS.md, Stage 1 checklist), then Stage 2.
