import "server-only";
import type { ScanResult } from "./scanner";
import type { Scan, Finding, ReadinessState, PillarSummary, Pillar } from "./types";

/* Scan persistence.
 *
 * Durable backend: a Supabase table (public.vs_scans) written through PostgREST
 * with a SERVER-ONLY service-role key (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).
 * RLS is enabled on the table with no policies, so browsers cannot touch it.
 *
 * If those env vars are absent — or a write fails — scans fall back to this
 * process's memory and the app reports `persisted: false`. History is then
 * per-server-instance and is NOT durable. We never claim otherwise. */

const MEM_LIMIT = 25;
const g = globalThis as unknown as { __vibeshield_runs?: ScanResult[] };
const memory: ScanResult[] = g.__vibeshield_runs ?? (g.__vibeshield_runs = []);

const URL_ = process.env.SUPABASE_URL?.replace(/\/$/, "");
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const PERSISTENCE_CONFIGURED = Boolean(URL_ && KEY);

export type StoreMode = "supabase" | "memory";
export interface StoreStatus {
  mode: StoreMode;
  persisted: boolean;
  /** Set when Supabase is configured but the last call failed. */
  error?: string;
}
let lastError: string | undefined;

export function storeStatus(): StoreStatus {
  if (PERSISTENCE_CONFIGURED && !lastError) return { mode: "supabase", persisted: true };
  return { mode: "memory", persisted: false, error: PERSISTENCE_CONFIGURED ? lastError : undefined };
}

interface Row {
  id: string;
  owner_id: string;
  source: ScanResult["source"];
  status: ScanResult["status"];
  started_at: string;
  finished_at: string;
  duration_ms: number;
  scanners: string[];
  file_count: number;
  score: number;
  pillars: ScanResult["pillars"];
  findings: ScanResult["findings"];
  events: ScanResult["events"];
  error: string | null;
}

const toRow = (r: ScanResult & { ownerId: string }): Row => ({
  id: r.scanId,
  owner_id: r.ownerId,
  source: r.source,
  status: r.status,
  started_at: r.startedAt,
  finished_at: r.finishedAt,
  duration_ms: r.durationMs,
  scanners: r.scanners,
  file_count: r.fileCount,
  score: r.score,
  pillars: r.pillars,
  findings: r.findings,
  events: r.events,
  error: r.error ?? null,
});

const fromRow = (w: Row): ScanResult => ({
  scanId: w.id,
  ownerId: w.owner_id,
  source: w.source,
  status: w.status,
  startedAt: w.started_at,
  finishedAt: w.finished_at,
  durationMs: w.duration_ms,
  scanners: w.scanners as ScanResult["scanners"],
  fileCount: w.file_count,
  score: w.score,
  pillars: w.pillars,
  findings: w.findings,
  events: w.events,
  error: w.error ?? undefined,
});

async function rest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${URL_}/rest/v1/${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: KEY!,
      authorization: `Bearer ${KEY}`,
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

function remember(result: ScanResult) {
  memory.unshift(result);
  if (memory.length > MEM_LIMIT) memory.length = MEM_LIMIT;
}

/** Persist a finished scan for its owner. Returns where it actually landed. */
export async function saveScan(scan: ScanResult, ownerId: string): Promise<StoreStatus> {
  const result = { ...scan, ownerId };
  if (PERSISTENCE_CONFIGURED) {
    try {
      await rest("vs_scans", {
        method: "POST",
        headers: { prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(toRow(result)),
      });
      lastError = undefined;
      return storeStatus();
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Supabase write failed";
    }
  }
  remember(result); // honest fallback — flagged non-durable by storeStatus()
  return storeStatus();
}

/** The owner's scans, newest first (durable rows merged with anything held in memory). */
export async function listRuns(ownerId: string, limit = 50): Promise<ScanResult[]> {
  let durable: ScanResult[] = [];
  if (PERSISTENCE_CONFIGURED) {
    try {
      const rows = await rest<Row[]>(
        `vs_scans?owner_id=eq.${encodeURIComponent(ownerId)}&select=*&order=finished_at.desc&limit=${limit}`,
      );
      durable = rows.map(fromRow).filter((r) => r.ownerId === ownerId);
      lastError = undefined;
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Supabase read failed";
    }
  }
  const seen = new Set(durable.map((r) => r.scanId));
  return [...durable, ...memory.filter((r) => r.ownerId === ownerId && !seen.has(r.scanId))]
    .sort((a, b) => b.finishedAt.localeCompare(a.finishedAt))
    .slice(0, limit);
}

/** A scan by id, only if it belongs to `ownerId` (otherwise null, same as not found). */
export async function getRun(id: string, ownerId: string): Promise<ScanResult | null> {
  if (PERSISTENCE_CONFIGURED) {
    try {
      const rows = await rest<Row[]>(
        `vs_scans?id=eq.${encodeURIComponent(id)}&owner_id=eq.${encodeURIComponent(ownerId)}&select=*&limit=1`,
      );
      const row = rows[0] ? fromRow(rows[0]) : null;
      if (row?.ownerId === ownerId) return row;
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Supabase read failed";
    }
  }
  return memory.find((r) => r.scanId === id && r.ownerId === ownerId) ?? null;
}

// ---- converters to UI view-models -------------------------------------------

export function resultToScan(r: ScanResult): Scan {
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
    findingCount: r.findings.length,
    origin: "live",
  };
}

function statusFor(score: number, open: number): PillarSummary["status"] {
  if (open === 0) return "healthy";
  if (score < 60) return "critical";
  if (score < 85) return "attention";
  return "healthy";
}

export function readinessFromRuns(runs: ScanResult[]): ReadinessState | null {
  const completed = runs.filter((r) => r.status === "completed");
  const latest = completed[0];
  if (!latest) return null;
  const chrono = completed.slice().reverse();
  const history = chrono.map((r) => ({ at: r.finishedAt, score: r.score }));
  const prev = completed[1]?.score;

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

export const findingsFromRuns = (runs: ScanResult[]): Finding[] =>
  runs.find((r) => r.status === "completed")?.findings ?? [];

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
