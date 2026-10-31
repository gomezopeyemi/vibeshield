import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard, NotConfiguredNotice } from "@/components/auth/auth-card";
import { ResendVerificationForm } from "@/components/auth/auth-forms";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { signOut } from "@/lib/auth/actions";
import { authMode, getSession } from "@/lib/auth/session";
import { DEMO_ALLOWED } from "@/lib/config";

export const metadata: Metadata = { title: "Verify your email" };

export default async function VerifyEmailPage() {
  const mode = authMode();
  const session = mode === "supabase" ? await getSession() : null;
  if (session?.state === "signed-in") redirect("/overview");
  const pendingEmail = session?.state === "unverified" ? session.email : undefined;

  return (
    <AuthCard
      title="Check your inbox"
      description={
        pendingEmail ? (
          <>We sent a verification link to <span className="font-medium text-ink">{pendingEmail}</span>. Open it to activate your account.</>
        ) : (
          "If you just signed up, we've sent you a verification link. Open it to activate your account."
        )
      }
      footer={<Link href="/login" className="font-medium text-brand hover:text-brand-ink">Back to sign in</Link>}
    >
      {mode !== "supabase" ? (
        <NotConfiguredNotice demoAvailable={DEMO_ALLOWED} />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-[10px] bg-surface-2 px-3.5 py-3 text-[12.5px] text-ink-2">
            <Icon name="Mail" className="size-5 shrink-0 text-brand" />
            The link expires after a while. Didn&apos;t get it? Check spam, or send a new one.
          </div>
          <ResendVerificationForm email={pendingEmail} />
          {pendingEmail && (
            <>
              <p className="text-[12px] leading-relaxed text-faint">
                If the link keeps failing, open it in the same browser you signed up in — some mail apps
                follow links in the background, which uses up a one-time link.
              </p>
              {/* Escape hatch: an unverified session can't reach the app shell's sign-out. */}
              <form action={signOut}>
                <Button type="submit" variant="ghost" size="sm" className="w-full">
                  <Icon name="LogOut" /> Sign out and use a different account
                </Button>
              </form>
            </>
          )}
        </div>
      )}
    </AuthCard>
  );
}
