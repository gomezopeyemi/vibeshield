/* Runtime configuration & integration credential detection (server-side).
 *
 * LIVE_MODE flips the data layer from DEMO fixtures to real integration calls.
 * Until the corresponding backends are implemented AND credentials are present,
 * the data layer returns an honest "unavailable" state — never faked success. */

export const LIVE_MODE = process.env.VIBESHIELD_LIVE === "1";

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
