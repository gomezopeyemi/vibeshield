import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard, NotConfiguredNotice } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/auth-forms";
import { authMode } from "@/lib/auth/session";
import { DEMO_ALLOWED } from "@/lib/config";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  const configured = authMode() === "supabase";
  return (
    <AuthCard
      title="Reset your password"
      description="Enter the email you signed up with and we'll send you a link to choose a new password."
      footer={<Link href="/login" className="font-medium text-brand hover:text-brand-ink">Back to sign in</Link>}
    >
      <div className="space-y-4">
        {!configured && <NotConfiguredNotice demoAvailable={DEMO_ALLOWED} />}
        <ForgotPasswordForm disabled={!configured} />
      </div>
    </AuthCard>
  );
}
