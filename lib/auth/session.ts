import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { DEMO_ALLOWED } from "@/lib/config";
import { AUTH_CONFIGURED } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { DEMO_USER } from "@/lib/demo/session";
import { fail } from "@/lib/api";
import type { AuthMode, SessionUser } from "@/lib/types";

/* Data Access Layer for identity. Every page data fetch, Server Action and
 * Route Handler goes through here; proxy.ts redirects are only an optimisation. */

export function authMode(): AuthMode {
  if (AUTH_CONFIGURED) return "supabase";
  return DEMO_ALLOWED ? "demo" : "unconfigured";
}

export type SessionState =
  | { state: "signed-in"; user: SessionUser }
  | { state: "unverified"; email: string }
  | { state: "signed-out" };

const DEMO_SESSION: SessionUser = { id: DEMO_USER.id, email: DEMO_USER.email, name: DEMO_USER.name, demo: true };

function displayName(meta: unknown, email: string): string {
  const fullName = (meta as { full_name?: unknown } | null)?.full_name;
  if (typeof fullName === "string" && fullName.trim()) return fullName.trim();
  return email.split("@")[0] || "Account";
}

/** Authoritative: asks the Auth server (catches revoked/deleted users), memoised per render. */
export const getSession = cache(async (): Promise<SessionState> => {
  // Identity is always per request — never baked into a prerendered page, whatever the auth mode.
  await connection();
  const mode = authMode();
  if (mode === "demo") return { state: "signed-in", user: DEMO_SESSION };
  if (mode === "unconfigured") return { state: "signed-out" };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  const u = data?.user;
  if (error || !u) return { state: "signed-out" };
  const email = u.email ?? "";
  if (!u.email_confirmed_at) return { state: "unverified", email };
  return { state: "signed-in", user: { id: u.id, email, name: displayName(u.user_metadata, email), demo: false } };
});

/** For pages and data fetches: returns the user or redirects. */
export async function requireUser(): Promise<SessionUser> {
  const s = await getSession();
  if (s.state === "signed-in") return s.user;
  redirect(s.state === "unverified" ? "/verify-email" : "/login");
}

/** For Route Handlers: returns the user, or a JSON 401/503 to send back as-is. */
export async function requireApiUser(): Promise<SessionUser | Response> {
  if (authMode() === "unconfigured") {
    return fail({
      code: "auth_not_configured",
      message: "Authentication is not configured on this deployment.",
      remediation: "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    });
  }
  const s = await getSession();
  if (s.state === "signed-in") return s.user;
  return fail(
    {
      code: "unauthorized",
      message: s.state === "unverified" ? "Verify your email address first." : "Sign in to use this endpoint.",
    },
    401,
  );
}
