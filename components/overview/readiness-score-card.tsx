"use client";

import { cn } from "@/lib/utils";
import type { ReadinessState } from "@/lib/types";
import { ScoreRing, scoreBandLabel } from "@/components/ui/score-ring";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ActionNotice } from "@/components/ui/action-notice";
import { useAction } from "@/lib/hooks/use-action";
import { useSession } from "@/components/providers";
import { useRouter } from "next/navigation";
import { timeAgo } from "@/lib/utils";

export function ReadinessScoreCard({ readiness }: { readiness: ReadinessState }) {
  const { run, status, response } = useAction("/api/scan");
  const { repository } = useSession();
  const router = useRouter();
  const repositoryId = repository?.id ?? "";
  const delta =
    readiness.previousScore !== undefined ? readiness.score - readiness.previousScore : undefined;

  return (
    <div className="flex h-full flex-col rounded-[12px] border border-line bg-surface p-5 shadow-[0_1px_3px_rgba(16,24,40,0.04)]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[14px] font-semibold text-ink">Launch Readiness Score</h2>
          <p className="text-[12px] text-muted">
            {readiness.lastScanAt ? `Last scan ${timeAgo(readiness.lastScanAt)}` : "Not scanned yet"}
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          disabled={status === "pending"}
          onClick={async () => {
            const res = await run({ repositoryId, target: "sample" });
            if (res.ok) router.refresh();
          }}
        >
          {status === "pending" ? (
            <><Icon name="Loader2" className="animate-spin" /> Starting…</>
          ) : (
            <><Icon name="RefreshCw" /> Re-scan</>
          )}
        </Button>
      </div>

      <div className="mt-2 flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
        <ScoreRing score={readiness.score} size={148} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-semibold text-ink">{scoreBandLabel(readiness.score)}</span>
            {delta !== undefined && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 text-[12px] font-medium",
                  delta >= 0 ? "text-success-ink" : "text-critical-ink",
                )}
              >
                <Icon name={delta >= 0 ? "TrendingUp" : "TrendingDown"} className="size-3.5" />
                {delta >= 0 ? "+" : ""}{delta} since last scan
              </span>
            )}
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">
            Your application has real strengths, with meaningful improvements still available before launch.
          </p>

          <div className="mt-3 rounded-[10px] border border-brand-soft-2 bg-brand-soft/40 px-3 py-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-brand-ink/80">Potential improvement</span>
              <span className="text-[13px] font-semibold text-brand-ink">+{readiness.potentialGain} pts</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-brand-soft-2">
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${Math.min(100, (readiness.potentialGain / (100 - readiness.score || 1)) * 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11.5px] text-brand-ink/70">
              Resolving open findings lifts your score toward launch-ready.
            </p>
          </div>
        </div>
      </div>

      <ActionNotice status={status} response={response} className="mt-3" />
    </div>
  );
}
