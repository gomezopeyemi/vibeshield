import Link from "next/link";
import { cn } from "@/lib/utils";
import type { LoopGraph, LoopGraphNode } from "@/lib/types";
import { Icon, type IconName } from "@/components/ui/icon";

const NODE_ICON: Record<LoopGraphNode["kind"], IconName> = {
  render: "RefreshCw",
  effect: "Workflow",
  state: "Braces",
  api: "Globe",
  db: "Database",
  deps: "Layers",
};

export function LoopGraphView({ graph }: { graph: LoopGraph }) {
  return (
    <div>
      <div className="flex items-stretch gap-1 overflow-x-auto pb-1">
        {graph.nodes.map((n, i) => {
          const outRisk = graph.edges.find((e) => e.from === n.id)?.risk;
          const chip = (
            <div
              className={cn(
                "flex min-w-[88px] flex-col items-center gap-1 rounded-[10px] border px-2.5 py-2 text-center",
                n.findingId
                  ? "border-warning-soft bg-warning-soft/40"
                  : "border-line bg-surface",
              )}
            >
              <Icon
                name={NODE_ICON[n.kind]}
                className={cn("size-4", n.findingId ? "text-warning-ink" : "text-muted")}
              />
              <span className="text-[11px] font-medium leading-tight text-ink-2">{n.label}</span>
            </div>
          );
          return (
            <div key={n.id} className="flex items-center gap-1">
              {n.findingId ? (
                <Link href="/fix?pillar=finops" className="transition-transform hover:-translate-y-0.5">
                  {chip}
                </Link>
              ) : (
                chip
              )}
              {i < graph.nodes.length - 1 && (
                <Icon
                  name="ArrowRight"
                  className={cn("size-4 shrink-0", outRisk ? "text-critical" : "text-faint")}
                />
              )}
            </div>
          );
        })}
        <div className="flex items-center gap-1">
          <Icon name="ArrowRight" className="size-4 shrink-0 text-critical" />
          <div className="flex min-w-[88px] flex-col items-center gap-1 rounded-[10px] border border-critical-soft bg-critical-soft/40 px-2.5 py-2 text-center">
            <Icon name="RotateCw" className="size-4 text-critical" />
            <span className="text-[11px] font-medium leading-tight text-critical-ink">re-render</span>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-start gap-2 rounded-[9px] bg-warning-soft/40 px-3 py-2">
        <Icon name="AlertTriangle" className="mt-0.5 size-3.5 shrink-0 text-warning-ink" />
        <p className="text-[11.5px] leading-relaxed text-warning-ink">
          <span className="font-semibold">Static potential loop</span> — the effect sets state that is also in its
          dependency array, which can re-trigger the render → effect → API cycle. Not confirmed at runtime.
        </p>
      </div>
    </div>
  );
}
