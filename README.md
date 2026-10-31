# VibeShield

**From vibe code to production ready.** An automated prompt-to-production
readiness, security and guardrail platform for apps built with AI dev tools
(Cursor, Lovable, Bolt, v0, Windsurf, Replit, Claude Code).

> **Build status:** `next build` passes · TypeScript clean · all 6 screens live.
> See [`IMPLEMENTATION_STATUS.md`](./IMPLEMENTATION_STATUS.md) for exactly what's
> real vs. awaiting backend credentials.

## Run

```bash
npm install
npm run dev      # http://localhost:3000  → redirects to /overview
```

```bash
npm run build && npm run start   # production
```

The app ships in **DEMO mode** so every screen is viewable. Demo data is clearly
flagged and never faked as live. To switch the data layer toward live
integrations, set `VIBESHIELD_LIVE=1` and provide integration credentials
(see `lib/config.ts`); until a backend is wired, live mode returns honest
"not connected" states rather than fabricated data.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Framer Motion ·
Radix UI primitives · Geist · prism-react-renderer · Zod.

## Architecture

```
app/
  (app)/                 # authenticated shell + the 9 routes
    overview  onboarding  fix  finops  database
    smoke-tests  context-sync  scans  integrations  settings
  api/                   # honest action boundaries (scan, fix/pr, finops, stripe, smoke, context)
components/
  ui/                    # design-system primitives (button, card, diff-view, score-ring, …)
  shell/                 # sidebar, topbar, command palette
  findings/ overview/ finops/ database/ testing/ integrations/ settings/
lib/
  types.ts               # ~20 typed entities (single source of truth)
  data.ts                # data layer = the integration boundary (demo ↔ live)
  config.ts  api.ts  prompts.ts  legal.ts  utils.ts  constants.ts
  demo/                  # isolated, clearly-labeled DEMO fixtures
```

## Design

Light-first, premium developer-infrastructure aesthetic (Linear / Stripe /
Vercel). White + neutral grey + dark ink type + one restrained blue accent.
Green / amber / coral are reserved for real status. Dark surfaces only for code
and terminal areas. **No purple.** Full tokens in `app/globals.css`.
