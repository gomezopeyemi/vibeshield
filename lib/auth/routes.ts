/* Route classification for proxy.ts. Default-deny: anything not listed as
 * public needs a session. API routes are excluded here because they answer
 * with 401 JSON themselves (requireApiUser) instead of a redirect. */

const PUBLIC_PATHS = new Set([
  "/",
  "/features",
  "/pricing",
  "/terms",
  "/privacy",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
]);

const PUBLIC_PREFIXES = ["/auth/"];

export const DEFAULT_AFTER_LOGIN = "/overview";

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export function isProtectedPath(pathname: string): boolean {
  if (pathname.startsWith("/api/") || pathname.startsWith("/_next/")) return false;
  return !isPublicPath(pathname);
}

const BASE = "http://vibeshield.invalid";

/** Same-origin relative path only; anything else (absolute, protocol-relative, backslash tricks) falls back. */
export function safeNext(raw: unknown, fallback = DEFAULT_AFTER_LOGIN): string {
  if (typeof raw !== "string" || raw.length > 512) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return fallback;
  try {
    const url = new URL(raw, BASE);
    if (url.origin !== BASE) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
