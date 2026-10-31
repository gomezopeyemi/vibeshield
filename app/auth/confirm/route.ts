import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { AUTH_CONFIGURED } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/routes";

const OTP_TYPES: readonly EmailOtpType[] = ["signup", "recovery", "email", "email_change", "invite", "magiclink"];

/* Landing point for links in verification and password-reset emails.
 * Supports both token_hash links (custom email template, works across browsers)
 * and PKCE `code` links (default template, same browser only). */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = safeNext(params.get("next"));
  const toLogin = (error: string) => {
    const res = NextResponse.redirect(new URL(`/login?error=${error}`, request.url));
    res.headers.set("cache-control", "private, no-store");
    return res;
  };

  if (!AUTH_CONFIGURED) return toLogin("auth_not_configured");

  // An OAuth provider reporting failure (e.g. the user cancelled at Google).
  const providerError = params.get("error") ?? params.get("error_code");
  if (providerError) {
    return toLogin(providerError === "access_denied" ? "oauth_cancelled" : "oauth_failed");
  }

  const supabase = await createClient();
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;
  const code = params.get("code");

  let ok = false;
  if (tokenHash && type && OTP_TYPES.includes(type)) {
    ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
  } else if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  }
  if (!ok) return toLogin("link_invalid");

  const res = NextResponse.redirect(new URL(next, request.url));
  res.headers.set("cache-control", "private, no-store");
  return res;
}
