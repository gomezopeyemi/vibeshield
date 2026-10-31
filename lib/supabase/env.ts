/* Public Supabase settings for VibeShield's own auth project. Both values are
 * browser-safe by design (URL + publishable/anon key). A privileged key placed
 * in a NEXT_PUBLIC_ var would ship to every visitor, so it is rejected and auth
 * is reported as misconfigured instead. */

export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
export const SUPABASE_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** True for secret keys or legacy JWT keys carrying the service_role claim. */
export function keyLooksPrivileged(key: string): boolean {
  if (key.startsWith("sb_secret_")) return true;
  const parts = key.split(".");
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as { role?: unknown };
    return payload.role === "service_role";
  } catch {
    return false;
  }
}

export const AUTH_KEY_PRIVILEGED = SUPABASE_PUBLIC_KEY !== "" && keyLooksPrivileged(SUPABASE_PUBLIC_KEY);

export const AUTH_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_PUBLIC_KEY) && !AUTH_KEY_PRIVILEGED;
