import "server-only";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, keyLooksPrivileged } from "./env";

/* The server's own identity, for writes members must not be able to make
 * themselves — today only recording scan results (public.record_scan). It
 * bypasses RLS, so every caller authorizes the user first. Never use it for
 * reads that a user's session can do. */

const SECRET = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export type AdminStatus = "configured" | "missing" | "not_privileged";

/** "not_privileged": a publishable/anon key was put where the secret key belongs. */
export const ADMIN_STATUS: AdminStatus = !SUPABASE_URL || !SECRET ? "missing" : keyLooksPrivileged(SECRET) ? "configured" : "not_privileged";

let client: SupabaseClient | undefined;

export function adminClient(): SupabaseClient | null {
  if (ADMIN_STATUS !== "configured") return null;
  return (client ??= createSupabaseClient(SUPABASE_URL, SECRET, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  }));
}
