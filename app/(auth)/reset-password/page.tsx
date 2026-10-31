import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard, AuthNotice, NotConfiguredNotice } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/auth-forms";
import { Button } from "@/components/ui/button";
import { authMode, getSession } from "@/lib/auth/session";
import { DEMO_ALLOWED } from "@/lib/config";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage() {
  const mode = authMode();
  const session = mode === "supabase" ? await getSession() : null;

  return (
    <AuthCard title="Choose a new password" description="Use at least 8 characters. You'll stay signed in on this device.">
      {mode !== "supabase" ? (
        <NotConfiguredNotice demoAvailable={DEMO_ALLOWED} />
      ) : session?.state === "signed-in" ? (
        <ResetPasswordForm />
      ) : (
        <div className="space-y-4">
          <AuthNotice tone="warning">This reset link is invalid or has expired.</AuthNotice>
          <Button asChild variant="primary" size="lg" className="w-full">
            <Link href="/forgot-password">Request a new link</Link>
          </Button>
        </div>
      )}
    </AuthCard>
  );
}
