import "server-only";
import { cache } from "react";
import { AUTH_CONFIGURED, SUPABASE_PUBLIC_KEY, SUPABASE_URL } from "./env";

/* Which social sign-in providers are actually enabled on the Supabase project.
 * Read from the project itself, never assumed: a provider button is only shown
 * when the backend will really handle it (ADR-010). On any failure we report
 * nothing enabled, so the UI degrades to email/password instead of offering a
 * button that would dead-end. */

export type SocialProvider = "google";

interface AuthSettings {
  external?: Record<string, boolean>;
  disable_signup?: boolean;
}

export const getEnabledProviders = cache(async (): Promise<Set<SocialProvider>> => {
  if (!AUTH_CONFIGURED) return new Set();
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: SUPABASE_PUBLIC_KEY },
      // Provider config changes rarely; avoid a round trip on every render.
      next: { revalidate: 300 },
    });
    if (!res.ok) return new Set();
    const settings = (await res.json()) as AuthSettings;
    const enabled = new Set<SocialProvider>();
    if (settings.external?.google) enabled.add("google");
    return enabled;
  } catch {
    return new Set();
  }
});
