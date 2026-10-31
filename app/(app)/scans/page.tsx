import type { Metadata } from "next";
import Link from "next/link";
import { getScans } from "@/lib/data";
import { listRuns, storeStatus } from "@/lib/scan-store";
import { formatDuration, timeAgo } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { DataBanner } from "@/components/ui/data-banner";
import { OriginPill, ScanPill } from "@/components/ui/status-pill";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { LineChart } from "@/components/ui/line-chart";
import type { ScanStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Repository Scans" };
export const dynamic = "force-dynamic";

const FILTERS: { key: string; label: string; match: (s: ScanStatus) => boolean }[] = [
  { key: "all", label: "All", match: () => true },
  { key: "completed", label: "Completed", match: (s) => s === "completed" },
  { key: "problem", label: "Failed / partial", match: (s) => s === "failed" || s === "partial" },
];

export default async function ScansPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const filter = FILTERS.find((f) => f.key === status) ?? FILTERS[0];
  const env = await getScans();
  const scans = env.data.filter((s) => filter.match(s.status));
  const runs = env.origin === "live" ? await listRuns() : [];
  const scoreById = new Map(runs.map((r) => [r.scanId, r.score]));
  const trend = runs
    .filter((r) => r.status === "completed")
    .slice()
    .reverse()
    .map((r) => ({ at: r.finishedAt, score: r.score }));
  const st = storeStatus();
  const completed = env.data.filter((s) => s.status === "completed").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Repository Scans"
        description="Every readiness scan of your repository, with the scanners used and the findings produced."
        badge={<OriginPill origin={env.origin} />}
        actions={
          <>
            {completed >= 2 && (
              <Button asChild variant="secondary">
                <Link href="/scans/compare"><Icon name="GitMerge" /> Compare latest two</Link>
              </Button>
            )}
            <Button asChild variant="primary">
              <Link href="/onboarding"><Icon name="Radar" /> New scan</Link>
            </Button>
          </>
        }
      />

      <DataBanner origin={env.origin} note={env.note} />
      {env.origin === "live" && (
        <p className="flex items-center gap-1.5 text-[12px] text-muted">
          <Icon name={st.persisted ? "Database" : "AlertTriangle"} className={st.persisted ? "size-3.5 text-success" : "size-3.5 text-warning-ink"} />
          {st.persisted ? "History is saved to Supabase and survives restarts." : "History is in server memory only — not durable."}
        </p>
      )}

      {trend.length >= 2 && (
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-ink">Readiness over time</h2>
            <span className="text-[11.5px] text-muted">{trend.length} completed scans</span>
          </div>
          <div className="mt-4"><LineChart data={trend} height={120} /></div>
        </Card>
      )}

      <div className="flex items-center gap-1.5">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/scans" : `/scans?status=${f.key}`}
            className={
              f.key === filter.key
                ? "rounded-full bg-ink px-3 py-1 text-[12.5px] font-medium text-white"
                : "rounded-full border border-line-strong bg-surface px-3 py-1 text-[12.5px] font-medium text-ink-2 hover:bg-surface-2"
            }
          >
            {f.label}
          </Link>
        ))}
      </div>

      <Card className="overflow-hidden">
        {scans.length === 0 ? (
          <p className="p-8 text-center text-[13px] text-muted">No scans match this filter.</p>
        ) : (
          <ul>
            {scans.map((s) => {
              const score = scoreById.get(s.id);
              const href = env.origin === "live" ? `/scans/${s.id}` : "/overview";
              return (
                <li key={s.id} className="border-b border-line last:border-0">
                  <Link href={href} className="flex flex-col gap-3 p-4 transition-colors hover:bg-surface-2/50 sm:flex-row sm:items-center">
                    <div className="sm:w-36"><ScanPill status={s.status} solid /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 font-mono text-[12.5px] text-ink">
                          <Icon name="GitBranch" className="size-3.5 text-faint" /> {s.branch}
                        </span>
                        {s.commitSha && <span className="font-mono text-[11.5px] text-muted">@ {s.commitSha}</span>}
                        <span className="text-[11.5px] text-faint">· {s.startedAt ? timeAgo(s.startedAt) : "—"}</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {s.scanners.map((sc) => <Badge key={sc} tone="muted" size="sm">{sc}</Badge>)}
                      </div>
                    </div>
                    <div className="flex items-center gap-5 text-[12px] sm:justify-end">
                      {score !== undefined && (
                        <div className="text-right"><p className="font-semibold tabular text-ink">{score}</p><p className="text-[10.5px] text-faint">readiness</p></div>
                      )}
                      <div className="text-right"><p className="font-semibold tabular text-ink">{s.findingCount}</p><p className="text-[10.5px] text-faint">findings</p></div>
                      {s.durationMs && (
                        <div className="text-right"><p className="font-semibold tabular text-ink">{formatDuration(s.durationMs)}</p><p className="text-[10.5px] text-faint">duration</p></div>
                      )}
                      <Icon name="ChevronRight" className="size-4 text-faint" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <p className="text-[11.5px] text-faint">
        Partial scans ran only a subset of scanners. A completed scan with zero findings is distinct from a failed scanner —
        failures are never shown as clean results.
      </p>
    </div>
  );
}
