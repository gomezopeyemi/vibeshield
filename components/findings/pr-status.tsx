import { cn } from "@/lib/utils";
import type { PrState, PullRequest } from "@/lib/types";
import { Icon, type IconName } from "@/components/ui/icon";

const PR_STATE: Record<PrState, { label: string; icon: IconName; cls: string; dot: string }> = {
  draft: { label: "Draft", icon: "GitPullRequest", cls: "text-muted", dot: "bg-faint" },
  open: { label: "Open", icon: "GitPullRequest", cls: "text-success-ink", dot: "bg-success" },
  "checks-running": { label: "Checks running", icon: "Loader2", cls: "text-brand-ink", dot: "bg-brand" },
  "checks-failed": { label: "Checks failed", icon: "XCircle", cls: "text-critical-ink", dot: "bg-critical" },
  approved: { label: "Approved", icon: "CheckCircle2", cls: "text-success-ink", dot: "bg-success" },
  merged: { label: "Merged", icon: "GitMerge", cls: "text-success-ink", dot: "bg-success" },
  closed: { label: "Closed", icon: "XCircle", cls: "text-muted", dot: "bg-faint" },
};

export function PrStatusChip({ state, number }: { state: PrState; number: number }) {
  const s = PR_STATE[state];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-line bg-surface px-1.5 py-0.5 text-[10.5px] font-medium",
        s.cls,
      )}
    >
      <Icon name={s.icon} className={cn("size-3", state === "checks-running" && "animate-spin")} />
      PR #{number} · {s.label}
    </span>
  );
}

export function PrChecks({ pr }: { pr: PullRequest }) {
  return (
    <ul className="space-y-1.5">
      {pr.checks.map((c) => (
        <li key={c.name} className="flex items-center gap-2 text-[12.5px]">
          {c.status === "passed" ? (
            <Icon name="CheckCircle2" className="size-4 text-success" />
          ) : c.status === "failed" ? (
            <Icon name="XCircle" className="size-4 text-critical" />
          ) : (
            <Icon name="Loader2" className="size-4 animate-spin text-brand" />
          )}
          <span className="font-mono text-ink-2">{c.name}</span>
          <span className="text-faint capitalize">· {c.status}</span>
        </li>
      ))}
    </ul>
  );
}
