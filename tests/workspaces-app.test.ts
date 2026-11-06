import { describe, it, expect, afterEach, vi } from "vitest";
import { createWorkspaceSchema, slugify, WORKSPACE_IDLE } from "@/lib/workspaces/schemas";
import type { SessionUser } from "@/lib/types";

/* App-side workspace layer. Database behaviour (RLS, roles) is covered by
 * tests/db; here Supabase is faked to check how its answers are translated. */

type Resp = { data: unknown; error: { code?: string; message?: string } | null };
type Op = { table: string; op: "select" | "update"; filters: Record<string, unknown>; payload?: unknown };

const ALICE: SessionUser = { id: "11111111-1111-4111-8111-111111111111", email: "a@x.test", name: "Alice", demo: false };
const DEMO: SessionUser = { id: "usr_demo", email: "d@x.test", name: "Demo", demo: true };
const WS1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const WS2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function fakeSupabase(handler: (op: Op) => Resp, rpc: (fn: string, args: unknown) => Resp = () => ({ data: null, error: null })) {
  const calls: Op[] = [];
  const rpcCalls: { fn: string; args: unknown }[] = [];
  const client = {
    from(table: string) {
      const st: Op = { table, op: "select", filters: {} };
      const chain = {
        select: () => chain,
        order: () => chain,
        maybeSingle: () => chain,
        eq: (col: string, v: unknown) => ((st.filters[col] = v), chain),
        update: (p: unknown) => ((st.op = "update"), (st.payload = p), chain),
        then: (ok: (r: Resp) => unknown, fail?: (e: unknown) => unknown) => {
          calls.push({ ...st, filters: { ...st.filters } });
          return Promise.resolve(handler(st)).then(ok, fail);
        },
      };
      return chain;
    },
    rpc(fn: string, args: unknown) {
      rpcCalls.push({ fn, args });
      return { single: async () => rpc(fn, args) };
    },
  };
  return { client, calls, rpcCalls };
}

async function load(opts: { user?: SessionUser; supabase: ReturnType<typeof fakeSupabase>; cookie?: string }) {
  vi.resetModules();
  const jar = new Map<string, string>(opts.cookie ? [["vs_workspace", opts.cookie]] : []);
  const refresh = vi.fn();
  vi.doMock("@/lib/auth/session", () => ({ requireUser: async () => opts.user ?? ALICE }));
  vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => opts.supabase.client }));
  vi.doMock("next/headers", () => ({
    cookies: async () => ({
      get: (n: string) => (jar.has(n) ? { name: n, value: jar.get(n) } : undefined),
      set: (n: string, v: string) => void jar.set(n, v),
    }),
  }));
  vi.doMock("next/cache", () => ({ refresh }));
  return { data: await import("@/lib/workspaces/data"), actions: await import("@/lib/workspaces/actions"), jar, refresh };
}

const form = (f: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(f)) fd.set(k, v);
  return fd;
};

const rows = {
  workspaces: [
    { id: WS1, name: "Personal", slug: "personal-1", plan: "free", workspace_members: [{ count: 1 }] },
    { id: WS2, name: "Acme", slug: "acme", plan: "pro", workspace_members: [{ count: 4 }] },
  ],
  memberships: [
    { workspace_id: WS1, role: "owner" },
    { workspace_id: WS2, role: "developer" },
  ],
};

const ready = () =>
  fakeSupabase((op) =>
    op.table === "workspaces" ? { data: rows.workspaces, error: null } : { data: rows.memberships, error: null },
  );

afterEach(() => {
  for (const m of ["@/lib/auth/session", "@/lib/supabase/server", "next/headers", "next/cache"]) vi.doUnmock(m);
});

describe("slugs", () => {
  it("suggests a valid slug from a name", () => {
    expect(slugify("Acme Inc.")).toBe("acme-inc");
    expect(slugify("  Café — Déjà Vu!! ")).toBe("cafe-deja-vu");
    expect(slugify("---")).toBe("");
    expect(slugify("x".repeat(60)).length).toBe(48);
  });

  it("accepts only what the database CHECK accepts", () => {
    expect(createWorkspaceSchema.safeParse({ name: "A", slug: "acme-2" }).success).toBe(true);
    for (const bad of ["-acme", "acme-", "Acme", "a_b", "", "a".repeat(49)]) {
      expect(createWorkspaceSchema.safeParse({ name: "A", slug: bad }).success, bad).toBe(bad === "Acme");
    }
  });
});

describe("getWorkspaceContext", () => {
  it("returns real workspaces with the caller's role and member counts", async () => {
    const { data } = await load({ supabase: ready() });
    const ctx = await data.getWorkspaceContext();
    expect(ctx.state).toBe("ready");
    expect(ctx.workspaces.map((w) => [w.name, w.role, w.memberCount, w.plan])).toEqual([
      ["Personal", "owner", 1, "free"],
      ["Acme", "developer", 4, "pro"],
    ]);
    expect(ctx.current.id).toBe(WS1);
  });

  it("restores the selected workspace from the cookie, ignoring ids the user can't see", async () => {
    expect((await (await load({ supabase: ready(), cookie: WS2 })).data.getWorkspaceContext()).current.id).toBe(WS2);
    const foreign = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    expect((await (await load({ supabase: ready(), cookie: foreign })).data.getWorkspaceContext()).current.id).toBe(WS1);
  });

  it("reports not_provisioned (not an empty success) when the tables don't exist", async () => {
    const missing = fakeSupabase(() => ({ data: null, error: { code: "PGRST205", message: "Could not find the table" } }));
    const ctx = await (await load({ supabase: missing })).data.getWorkspaceContext();
    expect(ctx.state).toBe("not_provisioned");
    expect(ctx.message).toMatch(/supabase\/migrations/);
    expect(ctx.workspaces).toHaveLength(1);
  });

  it("reports other failures as errors", async () => {
    const broken = fakeSupabase(() => ({ data: null, error: { code: "57014", message: "timeout" } }));
    expect((await (await load({ supabase: broken })).data.getWorkspaceContext()).state).toBe("error");
  });

  it("keeps the demo session on fixtures without touching the database", async () => {
    const sb = ready();
    const ctx = await (await load({ user: DEMO, supabase: sb })).data.getWorkspaceContext();
    expect(ctx.state).toBe("demo");
    expect(sb.calls).toHaveLength(0);
  });
});

describe("listMembers", () => {
  it("maps the roster with names, and a placeholder for blank names", async () => {
    const sb = fakeSupabase(() => ({
      data: [
        { user_id: "u1", role: "owner", created_at: "2026-11-01T00:00:00Z", profiles: { full_name: "Alice" } },
        { user_id: "u2", role: "viewer", created_at: "2026-11-02T00:00:00Z", profiles: { full_name: "" } },
      ],
      error: null,
    }));
    const members = await (await load({ supabase: sb })).data.listMembers(WS1);
    expect(members?.map((m) => [m.fullName, m.role])).toEqual([["Alice", "owner"], ["Unnamed member", "viewer"]]);
    expect(sb.calls[0].filters).toEqual({ workspace_id: WS1 });
  });

  it("returns null rather than an empty team on failure", async () => {
    const sb = fakeSupabase(() => ({ data: null, error: { code: "PGRST205" } }));
    expect(await (await load({ supabase: sb })).data.listMembers(WS1)).toBeNull();
  });
});

describe("createWorkspace", () => {
  it("refuses in the demo session", async () => {
    const sb = ready();
    const { actions } = await load({ user: DEMO, supabase: sb });
    expect((await actions.createWorkspace(WORKSPACE_IDLE, form({ name: "X", slug: "x" }))).status).toBe("error");
    expect(sb.rpcCalls).toHaveLength(0);
  });

  it("validates before calling the database", async () => {
    const sb = ready();
    const { actions } = await load({ supabase: sb });
    const s = await actions.createWorkspace(WORKSPACE_IDLE, form({ name: "", slug: "Bad Slug" }));
    expect(s.fieldErrors?.name?.length).toBeGreaterThan(0);
    expect(s.fieldErrors?.slug?.length).toBeGreaterThan(0);
    expect(sb.rpcCalls).toHaveLength(0);
  });

  it("creates via create_workspace(), selects it and refreshes", async () => {
    const newId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    const sb = fakeSupabase(() => ({ data: [], error: null }), () => ({ data: { id: newId }, error: null }));
    const { actions, jar, refresh } = await load({ supabase: sb });
    const s = await actions.createWorkspace(WORKSPACE_IDLE, form({ name: " Acme ", slug: "acme" }));
    expect(s.status).toBe("success");
    expect(sb.rpcCalls).toEqual([{ fn: "create_workspace", args: { ws_name: "Acme", ws_slug: "acme" } }]);
    expect(jar.get("vs_workspace")).toBe(newId);
    expect(refresh).toHaveBeenCalled();
  });

  it("explains a taken slug and a missing schema", async () => {
    const taken = fakeSupabase(() => ({ data: [], error: null }), () => ({ data: null, error: { code: "23505" } }));
    expect((await (await load({ supabase: taken })).actions.createWorkspace(WORKSPACE_IDLE, form({ name: "A", slug: "acme" }))).fieldErrors?.slug?.[0]).toMatch(/taken/);
    const missing = fakeSupabase(() => ({ data: [], error: null }), () => ({ data: null, error: { code: "PGRST202" } }));
    expect((await (await load({ supabase: missing })).actions.createWorkspace(WORKSPACE_IDLE, form({ name: "A", slug: "acme" }))).message).toMatch(/isn't set up/);
  });
});

describe("switchWorkspace", () => {
  it("rejects malformed ids without querying", async () => {
    const sb = ready();
    const { actions, jar } = await load({ supabase: sb });
    expect(await actions.switchWorkspace("../../etc")).toEqual({ ok: false });
    expect(sb.calls).toHaveLength(0);
    expect(jar.has("vs_workspace")).toBe(false);
  });

  it("refuses a workspace the database doesn't show the caller", async () => {
    const sb = fakeSupabase(() => ({ data: null, error: null }));
    const { actions, jar } = await load({ supabase: sb });
    expect(await actions.switchWorkspace(WS2)).toEqual({ ok: false });
    expect(jar.has("vs_workspace")).toBe(false);
  });

  it("remembers a visible workspace and refreshes", async () => {
    const sb = fakeSupabase(() => ({ data: { id: WS2 }, error: null }));
    const { actions, jar, refresh } = await load({ supabase: sb });
    expect(await actions.switchWorkspace(WS2)).toEqual({ ok: true });
    expect(jar.get("vs_workspace")).toBe(WS2);
    expect(refresh).toHaveBeenCalled();
  });
});

describe("renameWorkspace", () => {
  it("reports a permission error when RLS filters the update to zero rows", async () => {
    const sb = fakeSupabase(() => ({ data: [], error: null }));
    const s = await (await load({ supabase: sb })).actions.renameWorkspace(WORKSPACE_IDLE, form({ id: WS2, name: "New", slug: "new" }));
    expect(s.message).toMatch(/Only owners and admins/);
    expect(sb.calls[0]).toMatchObject({ table: "workspaces", op: "update", filters: { id: WS2 }, payload: { name: "New", slug: "new" } });
  });

  it("succeeds when a row is updated", async () => {
    const sb = fakeSupabase(() => ({ data: [{ id: WS1 }], error: null }));
    const { actions, refresh } = await load({ supabase: sb });
    expect((await actions.renameWorkspace(WORKSPACE_IDLE, form({ id: WS1, name: "Mine", slug: "mine" }))).status).toBe("success");
    expect(refresh).toHaveBeenCalled();
  });
});
