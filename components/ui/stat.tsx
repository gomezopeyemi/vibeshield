import { cn } from "@/lib/utils";
import { Icon, type IconName } from "./icon";

export function Stat({
  label,
  value,
  sub,
  icon,
  trend,
  empty,
  emptyLabel = "Not connected",
  className,
}: {
  label: string;
  value?: React.ReactNode;
  sub?: React.ReactNode;
  icon?: IconName;
  trend?: { value: string; direction: "up" | "down" | "flat"; good?: boolean };
  empty?: boolean;
  emptyLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-[11px] border border-line bg-surface p-4",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-muted">{label}</span>
        {icon && <Icon name={icon} className="size-4 text-faint" />}
      </div>
      {empty ? (
        <>
          <span className="text-[22px] font-semibold leading-none text-faint">—</span>
          <span className="text-[11.5px] text-faint">{emptyLabel}</span>
        </>
      ) : (
        <>
          <span className="text-[22px] font-semibold leading-none text-ink tabular">
            {value}
          </span>
          {(sub || trend) && (
            <div className="flex items-center gap-2">
              {trend && (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 text-[11.5px] font-medium",
                    trend.good === false
                      ? "text-critical-ink"
                      : trend.good === true
                        ? "text-success-ink"
                        : "text-muted",
                  )}
                >
                  <Icon
                    name={
                      trend.direction === "up"
                        ? "TrendingUp"
                        : trend.direction === "down"
                          ? "TrendingDown"
                          : "ArrowRight"
                    }
                    className="size-3"
                  />
                  {trend.value}
                </span>
              )}
              {sub && <span className="text-[11.5px] text-muted">{sub}</span>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
