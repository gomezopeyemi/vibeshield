import "server-only";
import { LIVE_MODE, DEMO_ALLOWED, isConnected } from "./config";
import { requireUser } from "./auth/session";
import { formatTime } from "./utils";
import type {
  DataEnvelope,
  ReadinessState,
  Finding,
  Scan,
  ScanEvent,
  PullRequest,
  VerificationBadge,
  Integration,
  RateLimitConfig,
  FinOpsSignal,
  LoopGraph,
  DatabaseTable,
  StripeEndpoint,
  SmokeTestRun,
  ContextFile,
  ContextAnalysis,
  MCPConnection,
  LegalDocState,
  SessionUser,
} from "./types";

import {
  DEMO_READINESS,
  DEMO_FINDINGS,
  DEMO_SCANS,
  DEMO_SCAN_EVENTS,
  DEMO_PULL_REQUESTS,
  DEMO_VERIFICATION,
} from "./demo/findings";
import { DEMO_INTEGRATIONS } from "./demo/session";
import {
  listRuns,
  getRun,
  latestCompletedRun,
  readinessFromRuns,
  resultToScan,
  storeStatus,
  ScanHistoryUnavailable,
  type ScanSummary,
  type StoredScan,
} from "./scan-store";
import { getScanScope, type ScanScope } from "./scan-scope";
import {
  DEMO_RATE_LIMIT,
  DEMO_FINOPS_SIGNALS,
  DEMO_LOOP_GRAPH,
  DEMO_PROVIDER_USAGE,
  type ProviderUsage,
} from "./demo/finops";
import {
  DEMO_TABLES,
  DEMO_STRIPE_ENDPOINT,
  DEMO_STRIPE_FLOW,
  type StripeFlowStep,
} from "./demo/database";
import {
  DEMO_SMOKE_RUN,
  DEMO_SMOKE_HISTORY,
  DEMO_CONTEXT_FILES,
  DEMO_CONTEXT_ANALYSIS,
  DEMO_MCP_CONNECTIONS,
  DEMO_LEGAL,
} from "./demo/testing";

/* ----------------------------------------------------------------------------
 * The data layer. Each function is the integration boundary for one domain.
 * In live mode with credentials, the TODO branch performs the real call; until
 * then it returns an honest `unavailable` envelope. Otherwise DEMO fixtures are
 * returned, always flagged with origin "demo".
 * -------------------------------------------------------------------------- */

/** Honest storage note: live data from memory is not durable and must say so. */
function storeNote(scope: ScanScope, runs: ScanSummary[]): string | undefined {
  const st = storeStatus(scope);
  if (st.persisted && runs.every((r) => r.persisted)) return undefined;
  return st.reason ?? "Some of these scans are held in server memory only and will be lost when the server restarts.";
}

/** The scope's scans plus the newest completed one in full, or why they
 * couldn't be read (which callers must never present as "no scans"). */
async function loadHistory(
  scope: ScanScope,
): Promise<{ runs: ScanSummary[]; latest: StoredScan | null; failure?: undefined } | { failure: string }> {
  try {
    const runs = await listRuns(scope);
    return { runs, latest: await latestCompletedRun(scope, runs) };
  } catch (err) {
    if (err instanceof ScanHistoryUnavailable) return { failure: err.message };
    throw err;
  }
}

function demo<T>(data: T, lastUpdatedAt?: string, note?: string): DataEnvelope<T> {
  return { origin: "demo", data, lastUpdatedAt, note };
}
function unavailable<T>(data: T, note: string): DataEnvelope<T> {
  return { origin: "unavailable", data, note };
}

/** Demo fixtures go only to the fixture session (auth not configured) in a
 * development/demo deployment with live mode off, and never beside real scans.
 * Real accounts always get their own data or an honest empty state. */
async function demoServable(user: SessionUser, runs?: ScanSummary[]): Promise<boolean> {
  if (!user.demo || !DEMO_ALLOWED || LIVE_MODE) return false;
  return (runs ?? (await listRuns(await getScanScope()))).length === 0;
}

export async function getReadiness(): Promise<DataEnvelope<ReadinessState>> {
  const user = await requireUser();
  const scope = await getScanScope();
  const history = await loadHistory(scope);
  if (history.failure !== undefined) return unavailable(emptyReadiness(), history.failure);
  const live = readinessFromRuns(history.runs, history.latest);
  if (live) {
    return { origin: "live", data: live, lastUpdatedAt: formatTime(live.lastScanAt!), note: storeNote(scope, history.runs) };
  }
  if (!(await demoServable(user, history.runs))) {
    return unavailable(emptyReadiness(), "No completed scan yet. Run a scan to compute your Launch Readiness Score.");
  }
  return demo(DEMO_READINESS, formatTime(DEMO_READINESS.lastScanAt!));
}

export async function getFindings(): Promise<DataEnvelope<Finding[]>> {
  const user = await requireUser();
  const history = await loadHistory(await getScanScope());
  if (history.failure !== undefined) return unavailable([], history.failure);
  if (history.latest) {
    return { origin: "live", data: history.latest.findings };
  }
  if (!(await demoServable(user, history.runs))) {
    return unavailable([], "No findings yet. Run a scan to see results.");
  }
  return demo(DEMO_FINDINGS);
}

export async function getFinding(id: string): Promise<Finding | null> {
  const user = await requireUser();
  const history = await loadHistory(await getScanScope());
  if (history.failure !== undefined) return null;
  const live = history.latest?.findings.find((f) => f.id === id);
  if (live) return live;
  return (await demoServable(user, history.runs)) ? (DEMO_FINDINGS.find((f) => f.id === id) ?? null) : null;
}

export async function getScans(): Promise<DataEnvelope<Scan[]>> {
  const user = await requireUser();
  const scope = await getScanScope();
  let runs: ScanSummary[];
  try {
    runs = await listRuns(scope);
  } catch (err) {
    if (err instanceof ScanHistoryUnavailable) return unavailable([], err.message);
    throw err;
  }
  if (runs.length > 0) {
    return { origin: "live", data: runs.map(resultToScan), note: storeNote(scope, runs) };
  }
  if (!(await demoServable(user, runs))) {
    return unavailable([], "No scans yet. Run your first scan.");
  }
  return demo(DEMO_SCANS);
}

export async function getScanEvents(scanId: string): Promise<DataEnvelope<ScanEvent[]>> {
  const user = await requireUser();
  let run: StoredScan | null;
  try {
    run = await getRun(scanId, await getScanScope());
  } catch (err) {
    if (err instanceof ScanHistoryUnavailable) return unavailable([], err.message);
    throw err;
  }
  if (run) return { origin: "live", data: run.events };
  if (!(await demoServable(user))) {
    return unavailable([], "Events for this scan are not available.");
  }
  return demo(DEMO_SCAN_EVENTS.filter((e) => e.scanId === scanId || scanId === "scan_latest"));
}

export async function getPullRequests(): Promise<DataEnvelope<PullRequest[]>> {
  const user = await requireUser();
  // No PR backend exists yet, so real PRs are never available; fixtures only in a demo-only context.
  if (!(await demoServable(user))) {
    return unavailable([], "Remediation PRs require the GitHub App, which is not connected yet.");
  }
  return demo(DEMO_PULL_REQUESTS);
}

export async function getVerification(): Promise<DataEnvelope<VerificationBadge>> {
  const user = await requireUser();
  // "Verified" needs a clean verification scan after merged fixes — not built yet, so never claim it.
  if (!(await demoServable(user))) {
    return unavailable(
      { state: "unverified" },
      "Verification needs a clean re-scan after fixes are merged. This is not available yet.",
    );
  }
  return demo(DEMO_VERIFICATION);
}

export async function getIntegrations(): Promise<DataEnvelope<Integration[]>> {
  const user = await requireUser();
  // Integration status is inherently about real connections — outside the
  // fixture session we report the actual (disconnected) state.
  if (!user.demo || LIVE_MODE || !DEMO_ALLOWED) {
    const live: Integration[] = DEMO_INTEGRATIONS.map((i) => ({
      ...i,
      status: "disconnected",
      connectedAt: undefined,
      remediation: i.remediation ?? `Connect ${i.label} to enable this module.`,
    }));
    return { origin: "live", data: live };
  }
  return demo(DEMO_INTEGRATIONS);
}

// ---- Aggregate domain payloads ----------------------------------------------

export interface FinOpsData {
  rateLimit: RateLimitConfig;
  signals: FinOpsSignal[];
  loopGraph: LoopGraph;
  providerUsage: ProviderUsage[];
  usageConnected: boolean;
}

export async function getFinOps(): Promise<DataEnvelope<FinOpsData>> {
  await requireUser();
  const usageConnected = isConnected("upstash"); // spend telemetry source
  return demo(
    {
      rateLimit: DEMO_RATE_LIMIT,
      signals: DEMO_FINOPS_SIGNALS,
      loopGraph: DEMO_LOOP_GRAPH,
      providerUsage: DEMO_PROVIDER_USAGE,
      usageConnected,
    },
    undefined,
    "Loop & route signals come from static analysis. Provider spend telemetry is not connected.",
  );
}

export interface DatabaseData {
  tables: DatabaseTable[];
  stripeEndpoint: StripeEndpoint;
  stripeFlow: StripeFlowStep[];
}

export async function getDatabase(): Promise<DataEnvelope<DatabaseData>> {
  await requireUser();
  if (LIVE_MODE && !isConnected("supabase")) {
    return unavailable(
      { tables: [], stripeEndpoint: DEMO_STRIPE_ENDPOINT, stripeFlow: [] },
      "Connect Supabase to inspect tables, RLS and policies.",
    );
  }
  return demo({
    tables: DEMO_TABLES,
    stripeEndpoint: DEMO_STRIPE_ENDPOINT,
    stripeFlow: DEMO_STRIPE_FLOW,
  });
}

export interface ContextSyncData {
  smokeCurrent: SmokeTestRun;
  smokeHistory: SmokeTestRun[];
  contextFiles: ContextFile[];
  contextAnalysis: ContextAnalysis;
  mcp: MCPConnection[];
  legal: LegalDocState;
}

export async function getTestingAndContext(): Promise<DataEnvelope<ContextSyncData>> {
  await requireUser();
  return demo({
    smokeCurrent: DEMO_SMOKE_RUN,
    smokeHistory: DEMO_SMOKE_HISTORY,
    contextFiles: DEMO_CONTEXT_FILES,
    contextAnalysis: DEMO_CONTEXT_ANALYSIS,
    mcp: DEMO_MCP_CONNECTIONS,
    legal: DEMO_LEGAL,
  });
}

function emptyReadiness(): ReadinessState {
  return {
    score: 0,
    potentialGain: 0,
    origin: "unavailable",
    history: [],
    pillars: [
      { pillar: "security", score: 0, status: "not-scanned", openFindings: 0 },
      { pillar: "finops", score: 0, status: "not-scanned", openFindings: 0 },
      { pillar: "revenue", score: 0, status: "not-scanned", openFindings: 0 },
      { pillar: "code-health", score: 0, status: "not-scanned", openFindings: 0 },
    ],
  };
}
