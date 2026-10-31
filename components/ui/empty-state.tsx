import { cn } from "@/lib/utils";
import { Icon, type IconName } from "./icon";

export function EmptyState({
  icon = "Inbox",
  title,
  description,
  action,
  tone = "muted",
  className,
}: {
  icon?: IconName;
  title: string;
  description?: string;
  action?: React.ReactNode;
  tone?: "muted" | "critical" | "warning";
  className?: string;
}) {
  const ring =
    tone === "critical"
      ? "bg-critical-soft text-critical"
      : tone === "warning"
        ? "bg-warning-soft text-warning-ink"
        : "bg-surface-2 text-faint";
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-12 text-center",
        className,
      )}
    >
      <div
        className={cn(
          "mb-3 flex size-11 items-center justify-center rounded-full",
          ring,
        )}
      >
        <Icon name={icon} className="size-5" />
      </div>
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-muted">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
