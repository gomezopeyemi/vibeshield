import { AppShell } from "@/components/shell/app-shell";
import { AppProvider } from "@/components/providers";
import { APP_ENV } from "@/lib/config";
import { requireUser } from "@/lib/auth/session";
import { Icon } from "@/components/ui/icon";

// Identity for the shell only; every data fetch re-checks via the DAL.
export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <AppProvider appEnv={APP_ENV} sessionUser={user}>
      <AppShell>
        {user.demo && (
          <div className="mb-5 flex items-start gap-2.5 rounded-[10px] border border-warning-soft bg-warning-soft px-3.5 py-2.5 text-[12.5px] leading-relaxed text-warning-ink" role="status">
            <Icon name="AlertTriangle" className="mt-0.5 size-4 shrink-0" />
            <p>
              <span className="font-semibold">Demo session.</span> Authentication isn&apos;t configured on this
              deployment, so you&apos;re signed in as a sample user. Set <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
              <code className="font-mono">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> to enable real accounts.
            </p>
          </div>
        )}
        {children}
      </AppShell>
    </AppProvider>
  );
}
