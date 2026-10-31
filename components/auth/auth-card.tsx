import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-[400px]">
      <div className="rounded-[14px] border border-line bg-surface p-6 shadow-[0_1px_3px_rgba(16,24,40,0.05)] sm:p-7">
        <h1 className="text-[20px] font-semibold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{description}</p>}
        <div className="mt-6">{children}</div>
      </div>
      {footer && <div className="mt-4 text-center text-[13px] text-muted">{footer}</div>}
    </div>
  );
}

export function AuthNotice({
  tone = "info",
  icon,
  children,
}: {
  tone?: "info" | "warning" | "critical" | "success";
  icon?: IconName;
  children: React.ReactNode;
}) {
  const styles = {
    info: "border-line bg-surface-2 text-ink-2",
    warning: "border-warning-soft bg-warning-soft text-warning-ink",
    critical: "border-critical-soft bg-critical-soft text-critical-ink",
    success: "border-success-soft bg-success-soft text-success-ink",
  }[tone];
  const fallback: IconName = tone === "success" ? "CheckCircle2" : tone === "info" ? "Info" : "AlertTriangle";
  return (
    <div className={cn("flex items-start gap-2.5 rounded-[10px] border px-3 py-2.5 text-[12.5px] leading-relaxed", styles)} role={tone === "critical" ? "alert" : "status"}>
      <Icon name={icon ?? fallback} className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function NotConfiguredNotice({ demoAvailable }: { demoAvailable: boolean }) {
  return (
    <AuthNotice tone="warning" icon="PlugZap">
      <span className="font-semibold">Authentication isn&apos;t configured on this deployment.</span>{" "}
      {demoAvailable ? (
        <>
          Accounts can&apos;t be created yet.{" "}
          <Link href="/overview" className="font-medium underline underline-offset-2">Explore with the demo session</Link>.
        </>
      ) : (
        "Sign-in is unavailable until it is."
      )}
    </AuthNotice>
  );
}
