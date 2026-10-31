import Link from "next/link";
import { cn } from "@/lib/utils";
import { Icon } from "./icon";
import type { ActionResponse, ActionStatus } from "@/lib/hooks/use-action";

/** Renders the honest outcome of an action: a not-connected block (with the
 * remediation + a link to Integrations), a generic error, or a success note. */
export function ActionNotice({
  status,
  response,
  className,
}: {
  status: ActionStatus;
  response: ActionResponse | null;
  className?: string;
}) {
  if (status === "idle" || status === "pending" || !response) return null;

  if (status === "blocked") {
    return (
      <div className={cn("rounded-[10px] border border-line bg-surface-2 p-3", className)}>
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-warning-soft">
            <Icon name="PlugZap" className="size-3.5 text-warning-ink" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-medium text-ink">Not connected — nothing was changed</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{response.message}</p>
            {response.remediation && (
              <p className="mt-1 text-[12px] leading-relaxed text-muted">{response.remediation}</p>
            )}
            <Link
              href="/integrations"
              className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-brand hover:text-brand-ink"
            >
              Go to Integrations <Icon name="ArrowRight" className="size-3" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className={cn("rounded-[10px] border border-critical-soft bg-critical-soft/50 p-3", className)}>
        <div className="flex items-start gap-2.5">
          <Icon name="AlertTriangle" className="mt-0.5 size-4 shrink-0 text-critical" />
          <p className="text-[12.5px] text-critical-ink">{response.message ?? "Something went wrong."}</p>
        </div>
      </div>
    );
  }

  // ok
  return (
    <div className={cn("rounded-[10px] border border-success-soft bg-success-soft/50 p-3", className)}>
      <div className="flex items-start gap-2.5">
        <Icon name="CheckCircle2" className="mt-0.5 size-4 shrink-0 text-success" />
        <p className="text-[12.5px] text-success-ink">Done.</p>
      </div>
    </div>
  );
}
