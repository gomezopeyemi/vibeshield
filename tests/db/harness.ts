import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";

/* A real Postgres (PGlite, in-process) with the parts of Supabase our
 * migrations rely on: the anon / authenticated / service_role roles, an
 * `auth.users` table, `auth.uid()` reading the request JWT claims, and
 * Supabase's default grants (ALL on new public tables to anon/authenticated),
 * so the migrations' explicit revokes are exercised for real. */

const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;

  create schema auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    raw_user_meta_data jsonb not null default '{}'::jsonb
  );
  create function auth.uid() returns uuid language sql stable as $$
    select coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    )::uuid
  $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;

  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`;

const MIGRATIONS = path.join(process.cwd(), "supabase", "migrations");

export async function freshDatabase(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(SUPABASE_STUB);
  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(path.join(MIGRATIONS, file), "utf8"));
  }
  return db;
}

export async function createUser(db: PGlite, email: string, fullName = ""): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    "insert into auth.users (email, raw_user_meta_data) values ($1, jsonb_build_object('full_name', $2::text)) returning id",
    [email, fullName],
  );
  return rows[0].id;
}

export type Actor = { role: "anon" } | { role: "authenticated"; userId: string };

/** Runs one statement as an API caller, exactly as PostgREST would: SET ROLE + JWT claims. */
export async function asUser<T = Record<string, unknown>>(
  db: PGlite,
  actor: Actor,
  sql: string,
  params: unknown[] = [],
): Promise<{ rows: T[]; affectedRows: number }> {
  const claims = actor.role === "anon" ? { role: "anon" } : { role: "authenticated", sub: actor.userId };
  await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify(claims)]);
  await db.exec(`set role ${actor.role}`);
  try {
    const res = await db.query<T>(sql, params);
    return { rows: res.rows, affectedRows: res.affectedRows ?? 0 };
  } finally {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claims', '', false)");
  }
}

export const user = (userId: string): Actor => ({ role: "authenticated", userId });
export const ANON: Actor = { role: "anon" };
