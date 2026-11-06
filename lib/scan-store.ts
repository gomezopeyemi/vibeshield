import "server-only";
import { z } from "zod";
import { SCORE_FORMULA_VERSION, type ScanResult } from "./scanner";
import { ADMIN_STATUS, adminClient } from "./supabase/admin";
import { createClient } from "./supabase/server";
import { isMissingSchema } from "./workspaces/data";
import type { ScanScope } from "./scan-scope";
import type { Scan, Finding, ReadinessState, PillarSummary, Pillar } from "./types";

/* Scan persistence.
 *
 * Durable: the workspace-owned tables in supabase/migrations/*_scans.sql.
 * Reads run as the signed-in user, so RLS (members only) decides what comes
 * back. Writes go through public.record_scan() with the server's secret key:
 * members must not be able to write scan results themselves.
 *
 * Not durable (the scope isn't a real workspace, the secret key is missing, or
 * the write failed): the scan is held in this process's memory under the
 * scope's key, flagged `persisted: false`, and the UI says so. A failed READ
 * throws ScanHistoryUnavailable, because unreadable history must never look
 * like an empty (clean) one. */

export type StoredScan = ScanResult & { persisted: boolean };
export type ScanSummary = Omit<StoredScan, "findings" | "events"> & { findingCount: number };

export class ScanHistoryUnavailable extends Error {}

// ---- memory fallback -----------------------------------------------------------

const PER_SCOPE = 25;
const TOTAL = 500;
type Held = { key: string; run: ScanResult };
const g = globalThis as unknown as { __vibeshield_runs?: Held[] };
const memory: Held[] = g.__vibeshield_runs ?? (g.__vibeshield_runs = []);

function hold(key: string, run: ScanResult) {
  memory.unshift({ key, run });
  let kept = 0;
  for (let i = 0; i < memory.length; i++) {
    if (memory[i].key === key && ++kept > PER_SCOPE) memory.splice(i--, 1);
  }
  if (memory.length > TOTAL) memory.length = TOTAL;
}

const held = (scope: ScanScope) => memory.filter((h) => h.key === scope.key).map((h) => h.run);

// ---- status --------------------------------------------------------------------

export interface StoreStatus {
  mode: "supabase" | "memory";
  persisted: boolean;
  /** Why scans aren't being saved, for the storage notice. */
  reason?: string;
}

const ADMIN_REASON = {
  missing: "Scan history isn't being saved: set SUPABASE_SECRET_KEY (server-only) so the server can record scans.",
  not_privileged: "Scan history isn't being saved: SUPABASE_SECRET_KEY holds a publishable key, not the project's secret key.",
} as const;

const NOT_PROVISIONED = "The scan history tables aren't set up on this Supabase project yet. Apply supabase/migrations/20261106000100_scans.sql.";

const writeFailures = new Map<string, string>();

/** Where the next scan in this scope will be saved. */
export function storeStatus(scope: ScanScope): StoreStatus {
  const memoryMode = (reason?: string): StoreStatus => ({ mode: "memory", persisted: false, reason });
  if (!scope.durable) return memoryMode(scope.reason);
  if (ADMIN_STATUS !== "configured") return memoryMode(ADMIN_REASON[ADMIN_STATUS]);
  const failure = writeFailures.get(scope.key);
  if (failure === NOT_PROVISIONED) return memoryMode(`${NOT_PROVISIONED} Until then scans are held in server memory only.`);
  if (failure) return memoryMode(`The last scan couldn't be saved to the database (${failure}), so it is held in server memory only.`);
  return { mode: "supabase", persisted: true };
}

// ---- write ---------------------------------------------------------------------

function toPayload(r: ScanResult, scope: ScanScope) {
  return {
    id: r.scanId,
    workspace_id: scope.key,
    created_by: scope.userId,
    source: { kind: r.source.kind, id: r.source.id, label: r.source.label, branch: r.source.branch, commit: r.source.commit ?? null },
    status: r.status,
    started_at: r.startedAt,
    finished_at: r.finishedAt,
    duration_ms: r.durationMs,
    scanners: r.scanners,
    file_count: r.fileCount,
    error: r.error?.slice(0, 2000) ?? null,
    // Only a completed scan has a score; anything else must not record one.
    score: r.status === "completed" ? r.score : null,
    pillars: r.pillars,
    formula_version: SCORE_FORMULA_VERSION,
    findings: r.findings.map((f) => ({
      id: f.id,
      pillar: f.pillar,
      severity: f.severity,
      status: f.status,
      scanner: f.scanner,
      title: f.title.slice(0, 300),
      human_summary: f.humanSummary,
      business_impact: f.businessImpact,
      evidence: f.evidence,
      recommendation: f.recommendation,
      context: f.context ?? null,
      resource: f.resource ?? null,
      score_delta: f.scoreDelta ?? null,
      detected_at: f.detectedAt,
    })),
    events: r.events.map((e) => ({
      at: e.at,
      scanner: e.scanner,
      level: e.level,
      message: e.message.slice(0, 2000),
      path: e.path ?? null,
      line: e.line ?? null,
    })),
  };
}

/** Save a finished scan in the caller's scope. Returns where it actually landed. */
export async function saveScan(scan: ScanResult, scope: ScanScope): Promise<StoreStatus> {
  if (!scope.canScan) throw new Error("saveScan called without permission to scan in this workspace");
  const admin = scope.durable ? adminClient() : null;
  if (admin) {
    const { error } = await admin.rpc("record_scan", { scan: toPayload(scan, scope) });
    if (!error) {
      writeFailures.delete(scope.key);
      return storeStatus(scope);
    }
    console.error("[scan-store] record_scan failed", error.code, error.message);
    writeFailures.set(scope.key, isMissingSchema(error) ? NOT_PROVISIONED : `error ${error.code || "unknown"}`);
  }
  hold(scope.key, scan); // honest fallback, flagged non-durable by storeStatus()
  return storeStatus(scope);
}

// ---- read ----------------------------------------------------------------------

const PILLAR = z.enum(["security", "finops", "revenue", "code-health"]);
const SCANNER = z.enum(["static-rules", "gitleaks", "semgrep", "tree-sitter", "supabase", "live-url", "nuclei"]);
const pillarScores = z.object({ security: z.number(), finops: z.number(), revenue: z.number(), "code-health": z.number() });
const snapshot = z.object({ score: z.number(), pillars: pillarScores });

const SCAN_COLUMNS =
  "id, source_kind, source_id, source_label, branch, commit_sha, status, started_at, finished_at, duration_ms, scanners, file_count, finding_count, error, score_snapshots(score, pillars)";
const FINDING_COLUMNS =
  "ord, id, pillar, severity, status, scanner, title, human_summary, business_impact, evidence, recommendation, context, resource, score_delta, detected_at";
const EVENT_COLUMNS = "seq, at, scanner, level, message, path, line";

const scanRow = z.object({
  id: z.string(),
  source_kind: z.enum(["sample", "local", "github"]),
  source_id: z.string(),
  source_label: z.string(),
  branch: z.string(),
  commit_sha: z.string().nullable(),
  status: z.enum(["queued", "running", "completed", "partial", "failed", "cancelled"]),
  started_at: z.string(),
  finished_at: z.string().nullable(),
  duration_ms: z.number().nullable(),
  scanners: z.array(SCANNER),
  file_count: z.number(),
  finding_count: z.number(),
  error: z.string().nullable(),
  // One-to-one embed: PostgREST returns an object (or null); accept a list too.
  score_snapshots: z.union([snapshot, z.array(snapshot)]).nullable(),
});

const findingRow = z.object({
  id: z.string(),
  pillar: PILLAR,
  severity: z.enum(["critical", "high", "medium", "low", "info"]),
  status: z.enum(["open", "fix-proposed", "pr-open", "pr-merged", "resolved", "verifying", "regressed", "dismissed"]),
  scanner: SCANNER,
  title: z.string(),
  human_summary: z.string(),
  business_impact: z.string(),
  evidence: z.string(),
  recommendation: z.string(),
  context: z
    .object({ path: z.string(), language: z.string(), startLine: z.number(), snippet: z.string(), proposed: z.string().optional() })
    .nullable(),
  resource: z.string().nullable(),
  score_delta: z.number().nullable(),
  detected_at: z.string(),
});

const eventRow = z.object({
  seq: z.number(),
  at: z.string(),
  scanner: SCANNER,
  level: z.enum(["info", "check", "warn", "fail", "phase"]),
  message: z.string(),
  path: z.string().nullable(),
  line: z.number().nullable(),
});

const detailRow = scanRow.extend({ findings: z.array(findingRow), scan_events: z.array(eventRow) });

/** Postgres and JS format timestamps differently; normalise so they sort as strings. */
const iso = (s: string) => new Date(s).toISOString();

const UNSCORED: Record<Pillar, number> = { security: 0, finops: 0, revenue: 0, "code-health": 0 };

function summaryFromRow(row: z.infer<typeof scanRow>): ScanSummary {
  const snap = Array.isArray(row.score_snapshots) ? row.score_snapshots[0] : row.score_snapshots;
  return {
    scanId: row.id,
    source: { kind: row.source_kind, id: row.source_id, label: row.source_label, branch: row.branch, commit: row.commit_sha ?? undefined },
    status: row.status,
    startedAt: iso(row.started_at),
    finishedAt: iso(row.finished_at ?? row.started_at),
    durationMs: row.duration_ms ?? 0,
    scanners: row.scanners,
    fileCount: row.file_count,
    findingCount: row.finding_count,
    score: snap?.score ?? 0,
    pillars: snap?.pillars ?? UNSCORED,
    error: row.error ?? undefined,
    persisted: true,
  };
}

function summarize(run: ScanResult, persisted: boolean): ScanSummary {
  const { findings, events: _events, ...rest } = run;
  return { ...rest, findingCount: findings.length, persisted };
}

function unavailable(error: { code?: string; message?: string }): never {
  if (isMissingSchema(error)) throw new ScanHistoryUnavailable(NOT_PROVISIONED);
  console.error("[scan-store] read failed", error.code, error.message);
  throw new ScanHistoryUnavailable("Scan history couldn't be loaded from the database. Refresh to try again.");
}

/** This scope's scans, newest first, without findings or events. */
export async function listRuns(scope: ScanScope, limit = 50): Promise<ScanSummary[]> {
  let durable: ScanSummary[] = [];
  if (scope.durable) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("scans")
      .select(SCAN_COLUMNS)
      .eq("workspace_id", scope.key)
      .order("finished_at", { ascending: false })
      .limit(limit);
    if (error) unavailable(error);
    const parsed = z.array(scanRow).safeParse(data ?? []);
    if (!parsed.success) unavailable({ message: parsed.error.message });
    durable = parsed.data.map(summaryFromRow);
  }
  const seen = new Set(durable.map((r) => r.scanId));
  const inMemory = held(scope)
    .filter((r) => !seen.has(r.scanId))
    .map((r) => summarize(r, false));
  return [...durable, ...inMemory].sort((a, b) => b.finishedAt.localeCompare(a.finishedAt)).slice(0, limit);
}

/** One scan with its findings and events, only if it is in this scope (otherwise null, same as not found). */
export async function getRun(id: string, scope: ScanScope): Promise<StoredScan | null> {
  if (scope.durable) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("scans")
      .select(`${SCAN_COLUMNS}, findings(${FINDING_COLUMNS}), scan_events(${EVENT_COLUMNS})`)
      .eq("workspace_id", scope.key)
      .eq("id", id)
      .order("ord", { referencedTable: "findings" })
      .order("seq", { referencedTable: "scan_events" })
      .maybeSingle();
    if (error) unavailable(error);
    if (data) {
      const parsed = detailRow.safeParse(data);
      if (!parsed.success) unavailable({ message: parsed.error.message });
      const row = parsed.data;
      const { findingCount: _count, ...summary } = summaryFromRow(row);
      return {
        ...summary,
        findings: row.findings.map(
          (f): Finding => ({
            id: f.id,
            pillar: f.pillar,
            severity: f.severity,
            status: f.status,
            scanner: f.scanner,
            title: f.title,
            humanSummary: f.human_summary,
            businessImpact: f.business_impact,
            evidence: f.evidence,
            recommendation: f.recommendation,
            context: f.context ?? undefined,
            resource: f.resource ?? undefined,
            scoreDelta: f.score_delta ?? undefined,
            detectedAt: iso(f.detected_at),
          }),
        ),
        events: row.scan_events.map((e) => ({
          id: `${row.id}_${e.seq}`,
          scanId: row.id,
          at: iso(e.at),
          scanner: e.scanner,
          level: e.level,
          message: e.message,
          path: e.path ?? undefined,
          line: e.line ?? undefined,
        })),
      };
    }
  }
  const run = held(scope).find((r) => r.scanId === id);
  return run ? { ...run, persisted: false } : null;
}

/** The newest completed scan in full, or null if there is none. */
export async function latestCompletedRun(scope: ScanScope, runs?: ScanSummary[]): Promise<StoredScan | null> {
  const latest = (runs ?? (await listRuns(scope))).find((r) => r.status === "completed");
  return latest ? getRun(latest.scanId, scope) : null;
}

// ---- converters to UI view-models -------------------------------------------

export function resultToScan(r: ScanSummary): Scan {
  return {
    id: r.scanId,
    repositoryId: r.source.id,
    status: r.status,
    startedAt: r.startedAt,
    finishedAt: r.finishedAt,
    durationMs: r.durationMs,
    scanners: r.scanners,
    branch: r.source.branch,
    commitSha: r.source.commit,
    findingCount: r.findingCount,
    origin: "live",
  };
}

function statusFor(score: number, open: number): PillarSummary["status"] {
  if (open === 0) return "healthy";
  if (score < 60) return "critical";
  if (score < 85) return "attention";
  return "healthy";
}

export function readinessFromRuns(runs: ScanSummary[], latest: ScanResult | null): ReadinessState | null {
  if (!latest) return null;
  const completed = runs.filter((r) => r.status === "completed");
  const history = completed
    .slice()
    .reverse()
    .map((r) => ({ at: r.finishedAt, score: r.score }));
  const prev = completed[completed.findIndex((r) => r.scanId === latest.scanId) + 1]?.score;

  const order: Pillar[] = ["security", "finops", "revenue", "code-health"];
  const pillars: PillarSummary[] = order.map((p) => {
    const open = latest.findings.filter((f) => f.pillar === p).length;
    return { pillar: p, score: latest.pillars[p], status: statusFor(latest.pillars[p], open), openFindings: open };
  });
  const openDeltas = latest.findings.reduce((n, f) => n + (f.scoreDelta ?? 0), 0);
  return {
    score: latest.score,
    previousScore: prev,
    potentialGain: Math.min(openDeltas, 100 - latest.score),
    lastScanAt: latest.finishedAt,
    origin: "live",
    history,
    pillars,
  };
}

// ---- scan comparison ----------------------------------------------------------

export interface ScanDiff {
  from: ScanResult;
  to: ScanResult;
  scoreDelta: number;
  pillarDeltas: Record<Pillar, number>;
  introduced: Finding[]; // in `to`, not in `from`
  resolved: Finding[]; //   in `from`, not in `to`
  unchanged: Finding[];
}

/** Finding ids are content hashes (rule + path + line), so they are stable across scans. */
export function diffScans(from: ScanResult, to: ScanResult): ScanDiff {
  const a = new Map(from.findings.map((f) => [f.id, f]));
  const b = new Map(to.findings.map((f) => [f.id, f]));
  const pillars = Object.keys(to.pillars) as Pillar[];
  return {
    from,
    to,
    scoreDelta: to.score - from.score,
    pillarDeltas: Object.fromEntries(pillars.map((p) => [p, to.pillars[p] - from.pillars[p]])) as Record<Pillar, number>,
    introduced: to.findings.filter((f) => !a.has(f.id)),
    resolved: from.findings.filter((f) => !b.has(f.id)),
    unchanged: to.findings.filter((f) => a.has(f.id)),
  };
}
