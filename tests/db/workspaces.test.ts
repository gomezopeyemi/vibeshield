import { describe, it, expect, beforeAll } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { ANON, asUser, createUser, freshDatabase, user } from "./harness";

/* Stage 2 · slice 1 acceptance: the migration applies from empty, new accounts
 * are bootstrapped, and workspace isolation + roles hold under RLS. */

let db: PGlite;
let alice: string, bob: string, carol: string, dan: string, eve: string;
let acme: string;

const roleOf = async (ws: string, uid: string) =>
  (await db.query<{ role: string }>("select role from public.workspace_members where workspace_id = $1 and user_id = $2", [ws, uid]))
    .rows[0]?.role;

beforeAll(async () => {
  db = await freshDatabase();
  alice = await createUser(db, "alice@example.test", "Alice Owner");
  bob = await createUser(db, "bob@example.test", "Bob Dev");
  carol = await createUser(db, "carol@example.test", "Carol Viewer");
  dan = await createUser(db, "dan@example.test", "Dan Admin");
  eve = await createUser(db, "eve@example.test", "Eve");
}, 60_000);

describe("schema", () => {
  it("enables RLS on every table and never uses an always-true policy", async () => {
    const { rows } = await db.query<{ relname: string; relrowsecurity: boolean }>(
      "select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'",
    );
    expect(rows.length).toBe(3);
    for (const r of rows) expect(r.relrowsecurity, r.relname).toBe(true);

    const policies = await db.query<{ policyname: string; qual: string | null; with_check: string | null }>(
      "select policyname, qual, with_check from pg_policies where schemaname = 'public'",
    );
    for (const p of policies.rows) {
      expect(p.qual, p.policyname).not.toBe("true");
      expect(p.with_check, p.policyname).not.toBe("true");
    }
  });

  it("gives the anonymous role no access at all", async () => {
    for (const t of ["profiles", "workspaces", "workspace_members"]) {
      await expect(asUser(db, ANON, `select * from public.${t}`)).rejects.toThrow(/permission denied/);
    }
    await expect(asUser(db, ANON, "select private.is_workspace_member(gen_random_uuid())")).rejects.toThrow(
      /permission denied/,
    );
    await expect(asUser(db, ANON, "select public.create_workspace('x', 'x')")).rejects.toThrow(/permission denied/);
  });
});

describe("new account bootstrap", () => {
  it("creates a profile, a personal workspace and an owner membership", async () => {
    const profile = await asUser<{ full_name: string }>(db, user(alice), "select full_name from public.profiles where id = $1", [alice]);
    expect(profile.rows).toEqual([{ full_name: "Alice Owner" }]);

    const ws = await asUser<{ id: string; name: string; plan: string }>(db, user(alice), "select id, name, plan from public.workspaces");
    expect(ws.rows).toHaveLength(1);
    expect(ws.rows[0]).toMatchObject({ name: "Personal", plan: "free" });
    expect(await roleOf(ws.rows[0].id, alice)).toBe("owner");
  });
});

describe("workspace isolation", () => {
  it("shows each user only their own workspaces, rosters and profiles", async () => {
    const bobWs = await asUser<{ id: string }>(db, user(bob), "select id from public.workspaces");
    expect(bobWs.rows).toHaveLength(1);
    const aliceWs = (await asUser<{ id: string }>(db, user(alice), "select id from public.workspaces")).rows[0].id;
    expect(bobWs.rows[0].id).not.toBe(aliceWs);

    expect((await asUser(db, user(bob), "select * from public.workspace_members where workspace_id = $1", [aliceWs])).rows).toHaveLength(0);
    expect((await asUser(db, user(bob), "select * from public.profiles where id = $1", [alice])).rows).toHaveLength(0);
  });

  it("stops a stranger from editing or joining someone else's workspace", async () => {
    const aliceWs = (await asUser<{ id: string }>(db, user(alice), "select id from public.workspaces")).rows[0].id;
    const upd = await asUser(db, user(bob), "update public.workspaces set name = 'pwned' where id = $1", [aliceWs]);
    expect(upd.affectedRows).toBe(0);
    await expect(
      asUser(db, user(bob), "insert into public.workspace_members (workspace_id, user_id, role) values ($1, $2, 'owner')", [aliceWs, bob]),
    ).rejects.toThrow();
    const del = await asUser(db, user(bob), "delete from public.workspaces where id = $1", [aliceWs]);
    expect(del.affectedRows).toBe(0);
    expect(await roleOf(aliceWs, bob)).toBeUndefined();
  });
});

describe("create_workspace()", () => {
  it("creates a workspace with the caller as its only owner", async () => {
    const { rows } = await asUser<{ id: string; created_by: string }>(
      db, user(alice), "select id, created_by from public.create_workspace('  Acme Inc  ', 'acme')",
    );
    acme = rows[0].id;
    expect(rows[0].created_by).toBe(alice);
    expect(await roleOf(acme, alice)).toBe("owner");
    const name = await asUser<{ name: string }>(db, user(alice), "select name from public.workspaces where id = $1", [acme]);
    expect(name.rows[0].name).toBe("Acme Inc");
  });

  it("rejects invalid or duplicate slugs", async () => {
    await expect(asUser(db, user(bob), "select public.create_workspace('X', 'Not A Slug!')")).rejects.toThrow(/check/);
    await expect(asUser(db, user(bob), "select public.create_workspace('Clash', 'acme')")).rejects.toThrow(/unique|duplicate/);
  });
});

describe("roles inside a shared workspace", () => {
  beforeAll(async () => {
    for (const [uid, role] of [[bob, "developer"], [carol, "viewer"], [dan, "admin"]] as const) {
      await asUser(db, user(alice), "insert into public.workspace_members (workspace_id, user_id, role) values ($1, $2, $3)", [acme, uid, role]);
    }
  });

  it("lets every member read the workspace, its roster and teammates' profiles", async () => {
    for (const uid of [bob, carol, dan]) {
      expect((await asUser(db, user(uid), "select id from public.workspaces where id = $1", [acme])).rows).toHaveLength(1);
      expect((await asUser(db, user(uid), "select user_id from public.workspace_members where workspace_id = $1", [acme])).rows).toHaveLength(4);
      expect((await asUser(db, user(uid), "select id from public.profiles where id = $1", [alice])).rows).toHaveLength(1);
    }
  });

  it("keeps developers and viewers read-only on workspace settings and membership", async () => {
    for (const uid of [bob, carol]) {
      expect((await asUser(db, user(uid), "update public.workspaces set name = 'x' where id = $1", [acme])).affectedRows).toBe(0);
      await expect(
        asUser(db, user(uid), "insert into public.workspace_members (workspace_id, user_id, role) values ($1, $2, 'viewer')", [acme, eve]),
      ).rejects.toThrow();
      expect((await asUser(db, user(uid), "delete from public.workspace_members where workspace_id = $1 and user_id = $2", [acme, carol === uid ? bob : carol])).affectedRows).toBe(0);
    }
  });

  it("lets an admin rename the workspace and manage non-owner members", async () => {
    expect((await asUser(db, user(dan), "update public.workspaces set name = 'Acme Ltd' where id = $1", [acme])).affectedRows).toBe(1);
    await asUser(db, user(dan), "insert into public.workspace_members (workspace_id, user_id, role) values ($1, $2, 'viewer')", [acme, eve]);
    expect(await roleOf(acme, eve)).toBe("viewer");
    expect((await asUser(db, user(dan), "update public.workspace_members set role = 'developer' where workspace_id = $1 and user_id = $2", [acme, eve])).affectedRows).toBe(1);
  });

  it("stops an admin from creating, demoting or removing owners", async () => {
    await expect(
      asUser(db, user(dan), "update public.workspace_members set role = 'owner' where workspace_id = $1 and user_id = $2", [acme, eve]),
    ).rejects.toThrow(/Only an owner/);
    await expect(
      asUser(db, user(dan), "update public.workspace_members set role = 'viewer' where workspace_id = $1 and user_id = $2", [acme, alice]),
    ).rejects.toThrow(/Only an owner/);
    await expect(
      asUser(db, user(dan), "delete from public.workspace_members where workspace_id = $1 and user_id = $2", [acme, alice]),
    ).rejects.toThrow(/Only an owner/);
  });

  it("stops anyone changing their own role or removing themselves", async () => {
    await expect(
      asUser(db, user(dan), "update public.workspace_members set role = 'owner' where workspace_id = $1 and user_id = $2", [acme, dan]),
    ).rejects.toThrow(/your own membership/);
    await expect(
      asUser(db, user(alice), "delete from public.workspace_members where workspace_id = $1 and user_id = $2", [acme, alice]),
    ).rejects.toThrow(/your own membership/);
  });

  it("only lets billing (not users) change a workspace's plan", async () => {
    await expect(asUser(db, user(alice), "update public.workspaces set plan = 'pro' where id = $1", [acme])).rejects.toThrow(
      /permission denied/,
    );
  });

  it("lets an owner hand over ownership, but never leaves a workspace ownerless", async () => {
    await asUser(db, user(alice), "update public.workspace_members set role = 'owner' where workspace_id = $1 and user_id = $2", [acme, dan]);
    await asUser(db, user(dan), "update public.workspace_members set role = 'admin' where workspace_id = $1 and user_id = $2", [acme, alice]);
    expect(await roleOf(acme, alice)).toBe("admin");
    // Dan is now the sole owner; even a privileged writer cannot remove the last owner.
    await expect(
      db.query("delete from public.workspace_members where workspace_id = $1 and user_id = $2", [acme, dan]),
    ).rejects.toThrow(/at least one owner/);
  });

  it("restricts deleting a workspace to its owners", async () => {
    const scratch = (await asUser<{ id: string }>(db, user(alice), "select id from public.create_workspace('Scratch', 'scratch')")).rows[0].id;
    await asUser(db, user(alice), "insert into public.workspace_members (workspace_id, user_id, role) values ($1, $2, 'admin')", [scratch, bob]);
    expect((await asUser(db, user(bob), "delete from public.workspaces where id = $1", [scratch])).affectedRows).toBe(0);
    expect((await asUser(db, user(alice), "delete from public.workspaces where id = $1", [scratch])).affectedRows).toBe(1);
    expect((await db.query("select 1 from public.workspace_members where workspace_id = $1", [scratch])).rows).toHaveLength(0);
  });
});

describe("profiles", () => {
  it("lets users edit only their own name and avatar", async () => {
    expect((await asUser(db, user(bob), "update public.profiles set full_name = 'Robert' where id = $1", [bob])).affectedRows).toBe(1);
    expect((await asUser(db, user(bob), "update public.profiles set full_name = 'hacked' where id = $1", [alice])).affectedRows).toBe(0);
    await expect(asUser(db, user(bob), "update public.profiles set created_at = now() where id = $1", [bob])).rejects.toThrow(
      /permission denied/,
    );
    await expect(
      asUser(db, user(bob), "update public.profiles set avatar_url = 'javascript:alert(1)' where id = $1", [bob]),
    ).rejects.toThrow(/check/);
  });
});

describe("account deletion", () => {
  it("removes the user's memberships and their now-empty personal workspace, keeping shared ones", async () => {
    const bobPersonal = (await db.query<{ id: string }>(
      "select w.id from public.workspaces w join public.workspace_members m on m.workspace_id = w.id where m.user_id = $1 and w.name = 'Personal'",
      [bob],
    )).rows[0].id;

    await db.query("delete from auth.users where id = $1", [bob]);

    expect((await db.query("select 1 from public.workspace_members where user_id = $1", [bob])).rows).toHaveLength(0);
    expect((await db.query("select 1 from public.workspaces where id = $1", [bobPersonal])).rows).toHaveLength(0);
    expect((await db.query("select 1 from public.workspaces where id = $1", [acme])).rows).toHaveLength(1);
    expect((await db.query("select 1 from public.profiles where id = $1", [bob])).rows).toHaveLength(0);
  });
});
