import { describe, it, expect, beforeAll } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { ANON, SERVICE, asUser, createUser, freshDatabase, user } from "./harness";

/* Stage 2 · slice 3: scan history is workspace-owned, readable by members
 * only, and writable only by the server through record_scan(). */

let db: PGlite;
let alice: string, bob: string, carol: string, eve: string;
let acme: string, alicePersonal: string;

let n = 0;
const scanId = () => `scan_${(++n).toString(36)}_${(0xabc00000 + n).toString(16)}`;

const finding = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  pillar: "security",
  severity: "critical",
  status: "open",
  scanner: "static-rules",
  title: `Finding ${id}`,
  human_summary: "s",
  business_impact: "b",
  evidence: "e",
  recommendation: "r",
  context: { path: "src/a.ts", language: "ts", startLine: 3, snippet: "x" },
  resource: null,
  score_delta: 12,
  detected_at: "2026-11-06T10:00:01Z",
  ...extra,
});

function payload(ws: string, actor: string | null, extra: Record<string, unknown> = {}) {
  return {
    id: scanId(),
    workspace_id: ws,
    created_by: actor,
    source: { kind: "sample", id: "sample_vulnerable", label: "sample/vulnerable-app", branch: "main", commit: "local" },
    status: "completed",
    started_at: "2026-11-06T10:00:00Z",
    finished_at: "2026-11-06T10:00:02Z",
    duration_ms: 2000,
    scanners: ["static-rules"],
    file_count: 9,
    error: null,
    score: 61,
    pillars: { security: 40, finops: 80, revenue: 70, "code-health": 90 },
    formula_version: "static-rules-v1",
    findings: [finding("f_a"), finding("f_b", { pillar: "finops", severity: "low", score_delta: 2 })],
    events: [
      { at: "2026-11-06T10:00:00Z", scanner: "static-rules", level: "phase", message: "Reading source" },
      { at: "2026-11-06T10:00:01Z", scanner: "static-rules", level: "fail", message: "Finding f_a", path: "src/a.ts", line: 3 },
      { at: "2026-11-06T10:00:02Z", scanner: "static-rules", level: "phase", message: "Scan complete" },
    ],
    ...extra,
  };
}

const record = (p: ReturnType<typeof payload>) =>
  asUser<{ record_scan: string }>(db, SERVICE, "select public.record_scan($1::jsonb)", [JSON.stringify(p)]);

const count = async (table: string, scan: string) =>
  Number((await db.query<{ c: number }>(`select count(*)::int as c from public.${table} where ${table === "scans" ? "id" : "scan_id"} = $1`, [scan])).rows[0].c);

const TABLES = ["scans", "score_snapshots", "findings", "scan_events"];

beforeAll(async () => {
  db = await freshDatabase();
  alice = await createUser(db, "alice@example.test", "Alice Owner");
  bob = await createUser(db, "bob@example.test", "Bob Dev");
  carol = await createUser(db, "carol@example.test", "Carol Viewer");
  eve = await createUser(db, "eve@example.test", "Eve Outsider");

  alicePersonal = (await asUser<{ id: string }>(db, user(alice), "select id from public.workspaces")).rows[0].id;
  acme = (await asUser<{ id: string }>(db, user(alice), "select id from public.create_workspace('Acme', 'acme')")).rows[0].id;
  await asUser(db, user(alice), "insert into public.workspace_members (workspace_id, user_id, role) values ($1, $2, 'developer'), ($1, $3, 'viewer')", [acme, bob, carol]);
}, 60_000);

describe("privileges", () => {
  it("gives anon nothing", async () => {
    for (const t of TABLES) await expect(asUser(db, ANON, `select * from public.${t}`)).rejects.toThrow(/permission denied/);
    await expect(asUser(db, ANON, "select public.record_scan('{}'::jsonb)")).rejects.toThrow(/permission denied/);
  });

  it("lets no signed-in user write scan results, even a workspace owner", async () => {
    await expect(asUser(db, user(alice), "select public.record_scan($1::jsonb)", [JSON.stringify(payload(acme, alice))])).rejects.toThrow(
      /permission denied for function record_scan/,
    );
    await expect(
      asUser(db, user(alice), "insert into public.scans (id, workspace_id, source_kind, source_id, source_label, branch, status, started_at) values ($1, $2, 'sample', 's', 's', 'main', 'completed', now())", [scanId(), acme]),
    ).rejects.toThrow(/permission denied/);
    for (const t of TABLES) {
      await expect(asUser(db, user(alice), `update public.${t} set workspace_id = workspace_id`)).rejects.toThrow(/permission denied/);
      await expect(asUser(db, user(alice), `delete from public.${t}`)).rejects.toThrow(/permission denied/);
    }
  });
});

describe("record_scan", () => {
  it("writes the scan, findings, events and score snapshot together", async () => {
    const p = payload(acme, bob);
    expect((await record(p)).rows[0].record_scan).toBe(p.id);

    const scan = (await db.query<Record<string, unknown>>("select * from public.scans where id = $1", [p.id])).rows[0];
    expect(scan).toMatchObject({ workspace_id: acme, created_by: bob, source_label: "sample/vulnerable-app", status: "completed", finding_count: 2, file_count: 9 });
    expect(await count("findings", p.id)).toBe(2);
    expect(await count("scan_events", p.id)).toBe(3);
    const snap = (await db.query<{ score: number; formula_version: string }>("select score, formula_version from public.score_snapshots where scan_id = $1", [p.id])).rows;
    expect(snap).toEqual([{ score: 61, formula_version: "static-rules-v1" }]);

    const ords = (await db.query<{ ord: number; id: string }>("select ord, id from public.findings where scan_id = $1 order by ord", [p.id])).rows;
    expect(ords).toEqual([{ ord: 0, id: "f_a" }, { ord: 1, id: "f_b" }]);
  });

  it("refuses viewers, outsiders and a missing actor, writing nothing", async () => {
    for (const actor of [carol, eve, null]) {
      const p = payload(acme, actor);
      await expect(record(p)).rejects.toThrow(/owner, admin or developer/);
      for (const t of TABLES) expect(await count(t, p.id), `${t} for ${actor}`).toBe(0);
    }
  });

  it("is all-or-nothing: one invalid finding leaves no scan behind", async () => {
    const p = payload(acme, bob, { findings: [finding("ok"), finding("bad", { severity: "catastrophic" })] });
    await expect(record(p)).rejects.toThrow(/check constraint/);
    for (const t of TABLES) expect(await count(t, p.id)).toBe(0);
  });

  it("stores no score for a scan that produced none", async () => {
    const p = payload(alicePersonal, alice, { status: "failed", score: null, findings: [], error: "source unavailable" });
    await record(p);
    expect(await count("scans", p.id)).toBe(1);
    expect(await count("score_snapshots", p.id)).toBe(0);
  });

  it("keeps findings whose content hash repeats within a scan", async () => {
    const p = payload(acme, alice, { findings: [finding("dup"), finding("dup")] });
    await record(p);
    expect(await count("findings", p.id)).toBe(2);
  });

  it("rejects a malformed scan id and an out-of-range score", async () => {
    await expect(record({ ...payload(acme, bob), id: "../../etc" })).rejects.toThrow(/check constraint/);
    await expect(record(payload(acme, bob, { score: 140 }))).rejects.toThrow(/check constraint/);
  });
});

describe("workspace isolation", () => {
  let acmeScan: string, personalScan: string;

  beforeAll(async () => {
    acmeScan = payload(acme, bob).id;
    await record({ ...payload(acme, bob), id: acmeScan });
    personalScan = payload(alicePersonal, alice).id;
    await record({ ...payload(alicePersonal, alice), id: personalScan });
  });

  it("lets every member of a workspace read its history, viewers included", async () => {
    for (const uid of [alice, bob, carol]) {
      for (const t of TABLES) {
        const col = t === "scans" ? "id" : "scan_id";
        const { rows } = await asUser(db, user(uid), `select * from public.${t} where ${col} = $1`, [acmeScan]);
        expect(rows.length, `${t} as ${uid}`).toBeGreaterThan(0);
      }
    }
  });

  it("shows outsiders nothing, without an error to probe", async () => {
    for (const t of TABLES) {
      const { rows } = await asUser(db, user(eve), `select * from public.${t}`);
      expect(rows, t).toHaveLength(0);
    }
  });

  it("keeps a personal workspace private from teammates", async () => {
    for (const uid of [bob, carol]) {
      const { rows } = await asUser(db, user(uid), "select id from public.scans where id = $1", [personalScan]);
      expect(rows).toHaveLength(0);
    }
    const mine = await asUser(db, user(alice), "select id from public.scans where id = $1", [personalScan]);
    expect(mine.rows).toHaveLength(1);
  });

  it("pins child rows to their scan's workspace", async () => {
    await expect(
      db.query(
        "insert into public.findings (workspace_id, scan_id, ord, id, pillar, severity, scanner, title, detected_at) values ($1, $2, 99, 'x', 'security', 'low', 'static-rules', 't', now())",
        [alicePersonal, acmeScan],
      ),
    ).rejects.toThrow(/foreign key/);
  });

  it("loses access when a member is removed", async () => {
    await asUser(db, user(alice), "delete from public.workspace_members where workspace_id = $1 and user_id = $2", [acme, carol]);
    const { rows } = await asUser(db, user(carol), "select id from public.scans where workspace_id = $1", [acme]);
    expect(rows).toHaveLength(0);
  });
});

describe("lifecycle", () => {
  it("keeps a scan when its author's account is deleted, and drops history with the workspace", async () => {
    const dev = await createUser(db, "dev@example.test");
    const ws = (await asUser<{ id: string }>(db, user(alice), "select id from public.create_workspace('Temp', 'temp')")).rows[0].id;
    await asUser(db, user(alice), "insert into public.workspace_members (workspace_id, user_id, role) values ($1, $2, 'developer')", [ws, dev]);
    const p = payload(ws, dev);
    await record(p);

    await db.query("delete from auth.users where id = $1", [dev]);
    expect((await db.query<{ created_by: string | null }>("select created_by from public.scans where id = $1", [p.id])).rows).toEqual([{ created_by: null }]);

    await asUser(db, user(alice), "delete from public.workspaces where id = $1", [ws]);
    for (const t of TABLES) expect(await count(t, p.id), t).toBe(0);
  });
});
