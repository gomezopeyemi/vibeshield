import { describe, it, expect, beforeAll } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { asUser, createUser, freshDatabase, user } from "./harness";

/* Accounts created before the workspace schema existed (e.g. the founder's
 * first sign-up) must come out of the migrations with a profile, a Personal
 * workspace and an owner membership, just like new sign-ups. */

let db: PGlite;
let early: string;
let late: string;

beforeAll(async () => {
  db = await freshDatabase({
    beforeMigrations: async (d) => {
      early = await createUser(d, "early@example.test", "Early Adopter");
    },
  });
  late = await createUser(db, "late@example.test", "Late Joiner");
}, 60_000);

describe("backfill for pre-existing accounts", () => {
  it("gives an early account a profile, a Personal workspace and ownership", async () => {
    const profile = await asUser<{ full_name: string }>(db, user(early), "select full_name from public.profiles where id = $1", [early]);
    expect(profile.rows).toEqual([{ full_name: "Early Adopter" }]);

    const ws = await asUser<{ id: string; name: string }>(db, user(early), "select id, name from public.workspaces");
    expect(ws.rows).toHaveLength(1);
    expect(ws.rows[0].name).toBe("Personal");
    const role = await db.query<{ role: string }>("select role from public.workspace_members where workspace_id = $1 and user_id = $2", [ws.rows[0].id, early]);
    expect(role.rows[0].role).toBe("owner");
  });

  it("does not duplicate anything for accounts the trigger already handled", async () => {
    const n = await db.query<{ n: number }>("select count(*)::int as n from public.workspace_members where user_id = $1", [late]);
    expect(n.rows[0].n).toBe(1);
  });

  it("lets a member list the roster with names through the profile link", async () => {
    const ws = (await asUser<{ id: string }>(db, user(early), "select id from public.workspaces")).rows[0].id;
    const roster = await asUser<{ role: string; full_name: string }>(
      db,
      user(early),
      `select m.role, p.full_name from public.workspace_members m
       join public.profiles p on p.id = m.user_id where m.workspace_id = $1`,
      [ws],
    );
    expect(roster.rows).toEqual([{ role: "owner", full_name: "Early Adopter" }]);

    const fk = await db.query("select 1 from pg_constraint where conname = 'workspace_members_profile_fk'");
    expect(fk.rows).toHaveLength(1);
  });
});
