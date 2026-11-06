import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { AuthCard, NotConfiguredNotice } from "@/components/auth/auth-card";
import { GoogleButton, OrDivider, SignupForm } from "@/components/auth/auth-forms";
import { authMode, getSession } from "@/lib/auth/session";
import { getEnabledProviders } from "@/lib/supabase/providers";
import { DEMO_ALLOWED } from "@/lib/config";

export const metadata: Metadata = { title: "Create your account" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const mode = authMode();
  if (mode === "supabase" && (await getSession()).state === "signed-in") redirect("/overview");
  const googleEnabled = (await getEnabledProviders()).has("google");
  // Prefill from the home page's email box; anything that isn't an email is ignored.
  const prefill = z.email().max(254).safeParse((await searchParams).email);

  return (
    <AuthCard
      title="Create your account"
      description="Free during early access. We'll email you a link to verify your address."
      footer={<>Already have an account? <Link href="/login" className="font-medium text-brand hover:text-brand-ink">Sign in</Link></>}
    >
      <div className="space-y-4">
        {mode !== "supabase" && <NotConfiguredNotice demoAvailable={DEMO_ALLOWED} />}
        {googleEnabled && (
          <>
            <GoogleButton label="Sign up with Google" />
            <OrDivider />
          </>
        )}
        <SignupForm disabled={mode !== "supabase"} defaultEmail={prefill.success ? prefill.data : undefined} />
      </div>
    </AuthCard>
  );
}
