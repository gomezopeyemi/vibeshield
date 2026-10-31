import { cn } from "@/lib/utils";
import { Icon } from "./icon";
import type { DataOrigin } from "@/lib/types";

/** Honest data-provenance banner. Demo data is always flagged; a failed scanner
 * returning stale data is never silently shown as current. */
export function DataBanner({
  origin,
  note,
  lastUpdatedAt,
  className,
}: {
  origin: DataOrigin;
  note?: string;
  lastUpdatedAt?: string;
  className?: string;
}) {
  if (origin === "live") return null;

  const config = {
    demo: {
      icon: "Beaker" as const,
      cls: "border-warning-soft bg-warning-soft/60 text-warning-ink",
      title: "Demo data",
      body:
        note ??
        "These are isolated demo fixtures. Connect GitHub, Supabase and your providers to see live results. Nothing here is written to production.",
    },
    stale: {
      icon: "Clock" as const,
      cls: "border-warning-soft bg-warning-soft/60 text-warning-ink",
      title: "Showing last successful result",
      body:
        note ??
        "The most recent scan did not complete. Values below are from the last successful run — not current.",
    },
    unavailable: {
      icon: "PlugZap" as const,
      cls: "border-line bg-surface-2 text-ink-2",
      title: "Not connected",
      body: note ?? "Connect the required integration to populate this view.",
    },
  }[origin];

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-[10px] border px-3.5 py-2.5 text-[12.5px] leading-relaxed",
        config.cls,
        className,
      )}
      role="status"
    >
      <Icon name={config.icon} className="mt-0.5 size-4 shrink-0" />
      <p>
        <span className="font-semibold">{config.title}.</span> {config.body}
        {lastUpdatedAt && (
          <span className="opacity-80"> · Last updated {lastUpdatedAt}</span>
        )}
      </p>
    </div>
  );
}
