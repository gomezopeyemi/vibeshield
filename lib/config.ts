/* Runtime configuration & integration credential detection (server-side).
 *
 * LIVE_MODE flips the data layer from DEMO fixtures to real integration calls.
 * Until the corresponding backends are implemented AND credentials are present,
 * the data layer returns an honest "unavailable" state — never faked success. */

export const LIVE_MODE = process.env.VIBESHIELD_LIVE === "1";

/* Deployment environment — the single source for the topbar pill and for
 * whether demo fixtures may be served. Unset resolves to "development" locally
 * and to "demo" in a production build, so an unconfigured deploy is labelled
 * demo rather than passing itself off as production. */
export type AppEnv = "development" | "demo" | "staging" | "production";

function resolveAppEnv(): AppEnv {
  const v = process.env.VIBESHIELD_ENV;
  if (v === "development" || v === "demo" || v === "staging" || v === "production") return v;
  return process.env.NODE_ENV === "production" ? "demo" : "development";
}

export const APP_ENV: AppEnv = resolveAppEnv();

/** Demo fixtures are only ever served in development and demo deployments. */
export const DEMO_ALLOWED = APP_ENV === "development" || APP_ENV === "demo";

export const CREDENTIALS = {
  github: Boolean(process.env.GITHUB_APP_ID && process.env.GITHUB_APP_PRIVATE_KEY),
  supabase: Boolean(process.env.SUPABASE_ACCESS_TOKEN),
  stripe: Boolean(process.env.STRIPE_SECRET_KEY),
  vercel: Boolean(process.env.VERCEL_TOKEN),
  anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
  upstash: Boolean(process.env.UPSTASH_REDIS_REST_URL),
} as const;

export type IntegrationKey = keyof typeof CREDENTIALS;

/** True only when live mode is on AND the integration has credentials. */
export function isConnected(key: IntegrationKey): boolean {
  return LIVE_MODE && CREDENTIALS[key];
}
