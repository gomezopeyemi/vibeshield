import Link from "next/link";
import { cn } from "@/lib/utils";
import type { PillarSummary } from "@/lib/types";
import { PILLARS } from "@/lib/constants";
import { Icon } from "@/components/ui/icon";

const STATUS_META = {
  healthy: { label: "Healthy", tone: "success", bar: "bg-success" },
  attention: { label: "Needs attention", tone: "warning", bar: "bg-warning" },
  critical: { label: "Critical", tone: "critical", bar: "bg-critical" },
  "not-scanned": { label: "Not scanned", tone: "muted", bar: "bg-faint" },
} as const;

export function PillarCards({ pillars }: { pillars: PillarSummary[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {pillars.map((p) => {
        const meta = PILLARS[p.pillar];
        const s = STATUS_META[p.status];
        return (
          <Link
            key={p.pillar}
            href={`/fix?pillar=${p.pillar}`}
            className="group flex flex-col rounded-[12px] border border-line bg-surface p-4 shadow-[0_1px_3px_rgba(16,24,40,0.04)] transition-all hover:border-line-strong hover:shadow-[0_4px_12px_-2px_rgba(16,24,40,0.08)]"
          >
            <div className="flex items-start justify-between">
              <div className="flex size-8 items-center justify-center rounded-[9px] bg-surface-2 text-ink-2 group-hover:bg-brand-soft group-hover:text-brand">
                <Icon name={meta.icon as "ShieldCheck"} className="size-[18px]" />
              </div>
              <Icon name="ArrowUpRight" className="size-4 text-faint opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <p className="mt-3 text-[13px] font-semibold text-ink">{meta.label}</p>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-[26px] font-semibold leading-none text-ink tabular">{p.score}</span>
              <span className="text-[12px] text-faint">/100</span>
            </div>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div className={cn("h-full rounded-full", s.bar)} style={{ width: `${p.score}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11.5px]">
              <span
                className={cn(
                  "font-medium",
                  s.tone === "success" && "text-success-ink",
                  s.tone === "warning" && "text-warning-ink",
                  s.tone === "critical" && "text-critical-ink",
                  s.tone === "muted" && "text-muted",
                )}
              >
                {s.label}
              </span>
              <span className="text-muted">
                {p.openFindings} open {p.openFindings === 1 ? "finding" : "findings"}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
