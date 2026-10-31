import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard, AuthNotice, NotConfiguredNotice } from "@/components/auth/auth-card";
import { GoogleButton, LoginForm, OrDivider } from "@/components/auth/auth-forms";
import { authMode, getSession } from "@/lib/auth/session";
import { getEnabledProviders } from "@/lib/supabase/providers";
import { safeNext } from "@/lib/auth/routes";
import { DEMO_ALLOWED } from "@/lib/config";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  link_invalid: "That link didn't work — it may have expired, been used already, or been opened in a different browser.",
  auth_not_configured: "Authentication isn't configured on this deployment.",
  oauth_cancelled: "Google sign-in was cancelled.",
  oauth_failed: "Google sign-in didn't complete. Try again, or use your email and password.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const mode = authMode();

  if (mode === "supabase") {
    const session = await getSession();
    if (session.state === "signed-in") redirect(safeNext(next));
  }
  const googleEnabled = (await getEnabledProviders()).has("google");

  return (
    <AuthCard
      title="Sign in to VibeShield"
      description="Welcome back. Pick up where your last scan left off."
      footer={<>New to VibeShield? <Link href="/signup" className="font-medium text-brand hover:text-brand-ink">Create an account</Link></>}
    >
      <div className="space-y-4">
        {mode !== "supabase" && <NotConfiguredNotice demoAvailable={DEMO_ALLOWED} />}
        {error && ERRORS[error] && mode === "supabase" && (
          <AuthNotice tone="critical">
            {ERRORS[error]}
            {error === "link_invalid" && (
              <>
                {" "}
                <Link href="/verify-email" className="font-medium underline underline-offset-2">Send a new link</Link>.
              </>
            )}
          </AuthNotice>
        )}
        {googleEnabled && (
          <>
            <GoogleButton next={next} label="Continue with Google" />
            <OrDivider />
          </>
        )}
        <LoginForm next={next} disabled={mode !== "supabase"} />
      </div>
    </AuthCard>
  );
}
