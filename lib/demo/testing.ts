import type {
  SmokeTestRun,
  ContextFile,
  ContextAnalysis,
  MCPConnection,
  LegalDocState,
} from "@/lib/types";

/* ⚠️ DEMO DATA — Playwright smoke tests, AI context sync, MCP & compliance. */

const now = Date.now();

export const DEMO_SMOKE_RUN: SmokeTestRun = {
  id: "smoke_latest",
  deploymentUrl: "https://saas-starter-git-main.vercel.app",
  status: "running",
  startedAt: new Date(now - 3 * 60_000).toISOString(),
  origin: "demo",
  steps: [
    {
      id: "step_signup",
      name: "Sign up",
      status: "passed",
      durationMs: 4200,
      screenshotUrl: "signup",
      consoleErrors: [],
    },
    {
      id: "step_login",
      name: "Log in",
      status: "passed",
      durationMs: 3100,
      screenshotUrl: "login",
      consoleErrors: [],
    },
    {
      id: "step_core",
      name: "Core action — create project",
      status: "running",
      screenshotUrl: "core",
    },
    {
      id: "step_checkout",
      name: "Checkout",
      status: "queued",
    },
  ],
};

export const DEMO_SMOKE_HISTORY: SmokeTestRun[] = [
  {
    id: "smoke_prev1",
    deploymentUrl: "https://saas-starter-git-main.vercel.app",
    status: "failed",
    startedAt: new Date(now - 26 * 3600_000).toISOString(),
    durationMs: 61_000,
    origin: "demo",
    steps: [
      { id: "s1", name: "Sign up", status: "passed", durationMs: 4100 },
      { id: "s2", name: "Log in", status: "passed", durationMs: 2900 },
      {
        id: "s3",
        name: "Core action — create project",
        status: "failed",
        durationMs: 8200,
        consoleErrors: ["TypeError: Cannot read properties of undefined (reading 'id')"],
        assertionsFailed: ['expect(page.getByText("Project created")).toBeVisible()'],
        stackTrace:
          "at ProjectForm.onSubmit (src/components/ProjectForm.tsx:48:19)\n  at HTMLFormElement.handleSubmit",
      },
    ],
  },
  {
    id: "smoke_prev2",
    deploymentUrl: "https://saas-starter-git-main.vercel.app",
    status: "passed",
    startedAt: new Date(now - 50 * 3600_000).toISOString(),
    durationMs: 58_000,
    origin: "demo",
    steps: [
      { id: "s1", name: "Sign up", status: "passed", durationMs: 3900 },
      { id: "s2", name: "Log in", status: "passed", durationMs: 2700 },
      { id: "s3", name: "Core action", status: "passed", durationMs: 6100 },
      { id: "s4", name: "Checkout", status: "passed", durationMs: 7300 },
    ],
  },
];

export const DEMO_CONTEXT_FILES: ContextFile[] = [
  {
    id: "ctx_cursor",
    name: ".cursorrules",
    exists: true,
    syncStatus: "synced",
    currentVersion: "v4",
    lastCommitAt: new Date(now - 36 * 3600_000).toISOString(),
  },
  {
    id: "ctx_windsurf",
    name: ".windsurfrules",
    exists: true,
    syncStatus: "synced",
    currentVersion: "v3",
    lastCommitAt: new Date(now - 36 * 3600_000).toISOString(),
  },
  {
    id: "ctx_claude",
    name: "CLAUDE.md",
    exists: true,
    syncStatus: "update-available",
    currentVersion: "v2",
    previousVersion: "v2",
    lastCommitAt: new Date(now - 80 * 3600_000).toISOString(),
    proposedDiff: `# Security guardrails (VibeShield)

- Never place a Supabase service_role key in client code or NEXT_PUBLIC_* env vars.
- All public tables must have RLS enabled with owner-scoped policies (auth.uid() = user_id).
- Stripe webhooks must call stripe.webhooks.constructEvent() before processing.
- Paid API routes require auth + rate limiting (Upstash token bucket).`,
  },
];

export const DEMO_CONTEXT_ANALYSIS: ContextAnalysis = {
  deadDependencies: 3,
  duplicateComponents: 5,
  filesOver2000Lines: 1,
  missingSecurityRules: 2,
};

export const DEMO_MCP_CONNECTIONS: MCPConnection[] = [
  {
    id: "mcp_cursor",
    client: "cursor",
    status: "connected",
    serverVersion: "1.0.6",
    lastHeartbeatAt: new Date(now - 40_000).toISOString(),
    lastValidationAt: new Date(now - 6 * 3600_000).toISOString(),
    capabilities: ["db-migration-validation", "hardcoded-key-detection", "rls-check"],
    recentEvents: [
      { at: new Date(now - 40_000).toISOString(), message: "heartbeat ok" },
      { at: new Date(now - 2 * 3600_000).toISOString(), message: "blocked migration: drops RLS on profiles", blocked: true },
    ],
  },
  {
    id: "mcp_windsurf",
    client: "windsurf",
    status: "connected",
    serverVersion: "1.2.3",
    lastHeartbeatAt: new Date(now - 55_000).toISOString(),
    lastValidationAt: new Date(now - 5 * 3600_000).toISOString(),
    capabilities: ["db-migration-validation", "hardcoded-key-detection"],
    recentEvents: [{ at: new Date(now - 55_000).toISOString(), message: "heartbeat ok" }],
  },
  {
    id: "mcp_claude",
    client: "claude-code",
    status: "connected",
    serverVersion: "1.0.1",
    lastHeartbeatAt: new Date(now - 70_000).toISOString(),
    lastValidationAt: new Date(now - 4 * 3600_000).toISOString(),
    capabilities: ["db-migration-validation", "hardcoded-key-detection", "rls-check"],
    recentEvents: [
      { at: new Date(now - 70_000).toISOString(), message: "heartbeat ok" },
      { at: new Date(now - 3 * 3600_000).toISOString(), message: "blocked: hardcoded key in commit", blocked: true },
    ],
  },
];

export const DEMO_LEGAL: LegalDocState = {
  detectedApis: ["Stripe", "OpenAI", "PostHog", "Supabase"],
  privacyPolicy: "none",
  termsOfService: "none",
  gdprDeleteEndpoint: "none",
};
