import { AppShell } from "@/components/shell/app-shell";
import { AppProvider } from "@/components/providers";
import { APP_ENV } from "@/lib/config";
import { requireUser } from "@/lib/auth/session";
import { getWorkspaceContext } from "@/lib/workspaces/data";
import { Icon } from "@/components/ui/icon";

// Identity for the shell only; every data fetch re-checks via the DAL.
export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const workspaceContext = await getWorkspaceContext();
  return (
    <AppProvider appEnv={APP_ENV} sessionUser={user} workspaceContext={workspaceContext}>
      <AppShell>
        {user.demo && (
          <Banner>
            <span className="font-semibold">Demo session.</span> Authentication isn&apos;t configured on this
            deployment, so you&apos;re signed in as a sample user. Set <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="font-mono">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> to enable real accounts.
          </Banner>
        )}
        {(workspaceContext.state === "not_provisioned" || workspaceContext.state === "error") && (
          <Banner>
            <span className="font-semibold">
              {workspaceContext.state === "not_provisioned" ? "Workspaces aren't set up yet." : "Workspaces unavailable."}
            </span>{" "}
            {workspaceContext.message} You&apos;re using a temporary personal workspace until then.
          </Banner>
        )}
        {children}
      </AppShell>
    </AppProvider>
  );
}

function Banner({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-start gap-2.5 rounded-[10px] border border-warning-soft bg-warning-soft px-3.5 py-2.5 text-[12.5px] leading-relaxed text-warning-ink" role="status">
      <Icon name="AlertTriangle" className="mt-0.5 size-4 shrink-0" />
      <p>{children}</p>
    </div>
  );
}
