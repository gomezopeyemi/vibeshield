import { describe, it, expect, afterEach, vi } from "vitest";
import type { ScanScope } from "@/lib/scan-scope";
import type { ScanResult } from "@/lib/scanner";
import type { SessionUser } from "@/lib/types";

/* The app side of durable scan history: what is sent to record_scan(), how
 * rows come back, and that every failure is reported rather than shown as an
 * empty history. The SQL itself is covered by tests/db/scans.test.ts. */

type G = typeof globalThis & { __vibeshield_runs?: unknown[] };
type PgError = { code?: string; message?: string } | null;
type Query = { table: string; filters: Record<string, unknown>; nested: string[]; select?: string };

const ALICE: SessionUser = { id: "11111111-1111-4111-8111-111111111111", email: "a@x.test", name: "Alice", demo: false };
const WS = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const scope = (over: Partial<ScanScope> = {}): ScanScope => ({ userId: ALICE.id, key: WS, durable: true, canScan: true, ...over });

/** PostgREST's shape for a scan recorded from `payload`, with Postgres-style timestamps. */
function rowFrom(p: Payload) {
  const pg = (s: string) => s.replace("Z", "+00:00");
  return {
    id: p.id,
    source_kind: p.source.kind,
    source_id: p.source.id,
    source_label: p.source.label,
    branch: p.source.branch,
    commit_sha: p.source.commit,
    status: p.status,
    started_at: pg(p.started_at),
    finished_at: pg(p.finished_at),
    duration_ms: p.duration_ms,
    scanners: p.scanners,
    file_count: p.file_count,
    finding_count: p.findings.length,
    error: p.error,
    score_snapshots: p.score === null ? null : { score: p.score, pillars: p.pillars },
    findings: p.findings.map((f, ord) => ({ ord, ...f, detected_at: pg(f.detected_at) })),
    scan_events: p.events.map((e, seq) => ({ seq, ...e, at: pg(e.at) })),
  };
}
type Payload = {
  id: string;
  source: { kind: string; id: string; label: string; branch: string; commit: string | null };
  status: string;
  started_at: string;
  finished_at: string;
  duration_ms: number;
  scanners: string[];
  file_count: number;
  error: string | null;
  score: number | null;
  pillars: Record<string, number>;
  formula_version: string;
  workspace_id: string;
  created_by: string;
  findings: ({ detected_at: string } & Record<string, unknown>)[];
  events: ({ at: string } & Record<string, unknown>)[];
};

function fakeSession(respond: (q: Query) => { data: unknown; error: PgError }) {
  const queries: Query[] = [];
  return {
    queries,
    client: {
      from(table: string) {
        const q: Query = { table, filters: {}, nested: [] };
        const run = () => (queries.push(q), Promise.resolve(respond(q)));
        const chain = {
          select: (cols: string) => ((q.select = cols), chain),
          eq: (c: string, v: unknown) => ((q.filters[c] = v), chain),
          order: (col: string, o?: { referencedTable?: string }) => (o?.referencedTable && q.nested.push(`${o.referencedTable}.${col}`), chain),
          limit: () => chain,
          maybeSingle: () => run(),
          then: (ok: (r: unknown) => unknown, bad?: (e: unknown) => unknown) => run().then(ok, bad),
        };
        return chain;
      },
    },
  };
}

async function load(opts: {
  admin?: "configured" | "missing" | "not_privileged";
  rpc?: (fn: string, args: { scan: Payload }) => { error: PgError };
  session?: ReturnType<typeof fakeSession>;
}) {
  vi.resetModules();
  (globalThis as G).__vibeshield_runs = [];
  const rpcCalls: { fn: string; args: { scan: Payload } }[] = [];
  const status = opts.admin ?? "configured";
  vi.doMock("@/lib/supabase/admin", () => ({
    ADMIN_STATUS: status,
    adminClient: () =>
      status === "configured"
        ? { rpc: async (fn: string, args: { scan: Payload }) => (rpcCalls.push({ fn, args }), (opts.rpc ?? (() => ({ error: null })))(fn, args)) }
        : null,
  }));
  const session = opts.session ?? fakeSession(() => ({ data: [], error: null }));
  vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => session.client }));
  const store = await import("@/lib/scan-store");
  const { runScan } = await import("@/lib/scanner");
  const { sampleSource } = await import("@/lib/source");
  const result: ScanResult = await runScan(sampleSource(), () => {}, { pace: false });
  return { store, result, rpcCalls, session };
}

afterEach(() => {
  for (const m of ["@/lib/supabase/admin", "@/lib/supabase/server", "@/lib/auth/session", "@/lib/scan-scope", "@/lib/workspaces/data"]) vi.doUnmock(m);
  vi.unstubAllEnvs();
  delete (globalThis as G).__vibeshield_runs;
});

describe("ADMIN_STATUS", () => {
  const status = async (env: Record<string, string>) => {
    vi.resetModules();
    for (const k of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"]) vi.stubEnv(k, "");
    for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
    return (await import("@/lib/supabase/admin")).ADMIN_STATUS;
  };
  const url = { NEXT_PUBLIC_SUPABASE_URL: "https://p.supabase.co" };

  it("needs the project URL and a secret key", async () => {
    expect(await status({})).toBe("missing");
    expect(await status({ SUPABASE_SECRET_KEY: "sb_secret_x" })).toBe("missing");
    expect(await status({ ...url, SUPABASE_SECRET_KEY: "sb_secret_x" })).toBe("configured");
    expect(await status({ ...url, SUPABASE_SERVICE_ROLE_KEY: "sb_secret_legacy_name" })).toBe("configured");
  });

  it("refuses a publishable key in the secret slot", async () => {
    expect(await status({ ...url, SUPABASE_SECRET_KEY: "sb_publishable_x" })).toBe("not_privileged");
  });
});

describe("saveScan", () => {
  it("records the scan in the caller's workspace, as the caller, with the formula version", async () => {
    const { store, result, rpcCalls } = await load({});
    const st = await store.saveScan(result, scope());
    expect(st).toEqual({ mode: "supabase", persisted: true });
    expect(rpcCalls).toHaveLength(1);
    const p = rpcCalls[0].args.scan;
    expect(rpcCalls[0].fn).toBe("record_scan");
    expect(p).toMatchObject({ id: result.scanId, workspace_id: WS, created_by: ALICE.id, score: result.score, formula_version: "static-rules-v1" });
    expect(p.findings).toHaveLength(result.findings.length);
    expect(p.events).toHaveLength(result.events.length);
    expect((globalThis as G).__vibeshield_runs).toHaveLength(0);
  });

  it("never records a score for a scan that didn't complete", async () => {
    const { store, result, rpcCalls } = await load({});
    await store.saveScan({ ...result, status: "failed", error: "source unavailable" }, scope());
    expect(rpcCalls[0].args.scan.score).toBeNull();
  });

  it("falls back to memory, says why, and still lists the scan when the write fails", async () => {
    const { store, result } = await load({ rpc: () => ({ error: { code: "42501", message: "denied" } }) });
    const st = await store.saveScan(result, scope());
    expect(st.persisted).toBe(false);
    expect(st.reason).toMatch(/couldn't be saved.*42501/);
    const runs = await store.listRuns(scope());
    expect(runs.map((r) => [r.scanId, r.persisted])).toEqual([[result.scanId, false]]);
  });

  it("holds scans in memory, with the reason, when the secret key is missing or wrong", async () => {
    for (const admin of ["missing", "not_privileged"] as const) {
      const { store, result, rpcCalls } = await load({ admin });
      const st = await store.saveScan(result, scope());
      expect(rpcCalls).toHaveLength(0);
      expect(st).toMatchObject({ mode: "memory", persisted: false });
      expect(st.reason).toMatch(/SUPABASE_SECRET_KEY/);
    }
  });

  it("never sends a non-workspace scope to the database", async () => {
    const { store, result, rpcCalls } = await load({});
    const personal = scope({ key: `not_provisioned:${ALICE.id}`, durable: false, reason: "not set up" });
    expect((await store.saveScan(result, personal)).reason).toBe("not set up");
    expect(rpcCalls).toHaveLength(0);
  });

  it("refuses to save without scan permission", async () => {
    const { store, result, rpcCalls } = await load({});
    await expect(store.saveScan(result, scope({ canScan: false }))).rejects.toThrow(/permission/);
    expect(rpcCalls).toHaveLength(0);
  });
});

describe("reading history", () => {
  it("round-trips a scan through the database shape unchanged", async () => {
    let recorded: Payload | undefined;
    const session = fakeSession((q) =>
      q.filters.id ? { data: rowFrom(recorded!), error: null } : { data: [rowFrom(recorded!)], error: null },
    );
    const { store, result } = await load({ rpc: (_fn, args) => ((recorded = args.scan), { error: null }), session });
    await store.saveScan(result, scope());

    const [summary] = await store.listRuns(scope());
    expect(summary).toMatchObject({ scanId: result.scanId, score: result.score, findingCount: result.findings.length, persisted: true });
    expect(summary.finishedAt).toBe(result.finishedAt);

    const full = await store.getRun(result.scanId, scope());
    expect(full).toEqual({ ...result, persisted: true });
    expect(session.queries.at(-1)).toMatchObject({ table: "scans", filters: { workspace_id: WS, id: result.scanId } });
    expect(session.queries.at(-1)?.nested).toEqual(["findings.ord", "scan_events.seq"]);
  });

  it("only ever asks for the current workspace", async () => {
    const session = fakeSession(() => ({ data: [], error: null }));
    const { store } = await load({ session });
    await store.listRuns(scope());
    expect(session.queries[0].filters).toEqual({ workspace_id: WS });
  });

  it("throws, rather than returning an empty history, when the database can't be read", async () => {
    const broken = fakeSession(() => ({ data: null, error: { code: "57014", message: "timeout" } }));
    const { store } = await load({ session: broken });
    await expect(store.listRuns(scope())).rejects.toBeInstanceOf(store.ScanHistoryUnavailable);
    await expect(store.getRun("scan_x_00000000", scope())).rejects.toBeInstanceOf(store.ScanHistoryUnavailable);

    const malformed = fakeSession(() => ({ data: [{ id: "scan_x_00000000", status: "exploded" }], error: null }));
    const { store: s2 } = await load({ session: malformed });
    await expect(s2.listRuns(scope())).rejects.toBeInstanceOf(s2.ScanHistoryUnavailable);
  });

  it("names the missing migration when the scan tables aren't there", async () => {
    const missing = fakeSession(() => ({ data: null, error: { code: "PGRST205", message: "Could not find the table" } }));
    const { store, result } = await load({ session: missing, rpc: () => ({ error: { code: "PGRST202", message: "no function" } }) });
    await expect(store.listRuns(scope())).rejects.toThrow(/_scans\.sql/);
    expect((await store.saveScan(result, scope())).reason).toMatch(/aren't set up.*_scans\.sql/);
  });

  it("returns null for a scan outside the workspace, same as not found", async () => {
    const session = fakeSession(() => ({ data: null, error: null }));
    const { store } = await load({ session });
    expect(await store.getRun("scan_x_00000000", scope())).toBeNull();
  });
});

describe("data layer on an unreadable history", () => {
  it("says the history couldn't be loaded instead of 'no scans yet'", async () => {
    const broken = fakeSession(() => ({ data: null, error: { code: "57014", message: "timeout" } }));
    await load({ session: broken });
    vi.doMock("@/lib/auth/session", () => ({ requireUser: async () => ALICE }));
    vi.doMock("@/lib/scan-scope", () => ({ getScanScope: async () => scope() }));
    const data = await import("@/lib/data");
    for (const env of [await data.getReadiness(), await data.getFindings(), await data.getScans()]) {
      expect(env.origin).toBe("unavailable");
      expect(env.note).toMatch(/couldn't be loaded/);
    }
  });
});

describe("scan routes", () => {
  it("refuse viewers with 403 before running anything", async () => {
    vi.resetModules();
    vi.doMock("@/lib/auth/session", () => ({ requireApiUser: async () => ALICE }));
    vi.doMock("@/lib/scan-scope", () => ({ getScanScope: async () => scope({ canScan: false }) }));
    const runScan = vi.fn();
    vi.doMock("@/lib/scanner", () => ({ runScan }));

    const post = await (await import("@/app/api/scan/route")).POST(
      new Request("http://x/api/scan", { method: "POST", body: "{}", headers: { "content-type": "application/json" } }),
    );
    expect(post.status).toBe(403);
    expect(await post.json()).toMatchObject({ ok: false, code: "forbidden" });

    const stream = await (await import("@/app/api/scan/stream/route")).GET(new Request("http://x/api/scan/stream"));
    expect(stream.status).toBe(403);
    expect(runScan).not.toHaveBeenCalled();
    vi.doUnmock("@/lib/scanner");
  });
});
