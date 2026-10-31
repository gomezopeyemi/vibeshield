import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRun, listRuns, storeStatus } from "@/lib/scan-store";
import { cn, formatDuration, formatTime, timeAgo } from "@/lib/utils";
import { PILLARS, PILLAR_ORDER } from "@/lib/constants";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ScanPill } from "@/components/ui/status-pill";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { ScoreRing } from "@/components/ui/score-ring";

export const metadata: Metadata = { title: "Scan detail" };
export const dynamic = "force-dynamic";

export default async function ScanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = await getRun(id);
  if (!run) notFound();

  const runs = await listRuns();
  const idx = runs.findIndex((r) => r.scanId === id);
  const previous = runs.slice(idx + 1).find((r) => r.status === "completed");
  const st = storeStatus();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scan detail"
        description={`${run.source.label} · ${run.source.branch}${run.source.commit ? ` @ ${run.source.commit}` : ""} · ${formatTime(run.finishedAt)}`}
        badge={<ScanPill status={run.status} solid />}
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href="/scans"><Icon name="ChevronLeft" /> All scans</Link>
            </Button>
            {previous && (
              <Button asChild variant="primary">
                <Link href={`/scans/compare?from=${previous.scanId}&to=${run.scanId}`}>
                  <Icon name="GitMerge" /> Compare with previous
                </Link>
              </Button>
            )}
          </>
        }
      />

      {!st.persisted && (
        <div className="flex items-start gap-2.5 rounded-[10px] border border-warning-soft bg-warning-soft/60 px-3.5 py-2.5 text-[12.5px] text-warning-ink" role="status">
          <Icon name="AlertTriangle" className="mt-0.5 size-4 shrink-0" />
          <p><span className="font-semibold">Not saved.</span> This scan is held in server memory only and will be lost when the server restarts.</p>
        </div>
      )}

      {run.status === "failed" && (
        <Card className="border-critical-soft p-4">
          <p className="text-[13px] font-medium text-critical-ink">This scan failed — its results are not a clean bill of health.</p>
          {run.error && <p className="mt-1 font-mono text-[12px] text-muted">{run.error}</p>}
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
        <Card className="flex items-center justify-center p-6">
          <ScoreRing score={run.score} size={150} />
        </Card>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PILLAR_ORDER.map((p) => (
            <Card key={p} className="p-4">
              <p className="text-[12px] font-medium text-muted">{PILLARS[p].short}</p>
              <p className="mt-1 text-[26px] font-semibold leading-none tabular text-ink">{run.pillars[p]}</p>
              <p className="mt-1 text-[11px] text-faint">
                {run.findings.filter((f) => f.pillar === p).length} findings
              </p>
            </Card>
          ))}
          <Card className="p-4">
            <p className="text-[12px] font-medium text-muted">Files scanned</p>
            <p className="mt-1 text-[26px] font-semibold leading-none tabular text-ink">{run.fileCount}</p>
          </Card>
          <Card className="p-4">
            <p className="text-[12px] font-medium text-muted">Duration</p>
            <p className="mt-1 text-[26px] font-semibold leading-none tabular text-ink">{formatDuration(run.durationMs)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-[12px] font-medium text-muted">Findings</p>
            <p className="mt-1 text-[26px] font-semibold leading-none tabular text-ink">{run.findings.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-[12px] font-medium text-muted">Ran</p>
            <p className="mt-1 text-[15px] font-semibold leading-tight text-ink">{timeAgo(run.finishedAt)}</p>
          </Card>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-[15px] font-semibold text-ink">Findings in this scan</h2>
        {run.findings.length === 0 ? (
          <Card className="p-6 text-center text-[13px] text-muted">
            {run.status === "completed"
              ? "Completed with zero findings across every scanner that ran."
              : "No findings recorded — but this scan did not complete, so that is not a clean result."}
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <ul>
              {run.findings.map((f) => (
                <li key={f.id} className="flex items-start gap-3 border-b border-line p-4 last:border-0">
                  <SeverityBadge severity={f.severity} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-medium text-ink">{f.title}</p>
                    <p className="truncate font-mono text-[11.5px] text-muted">
                      {f.context ? `${f.context.path}:${f.context.startLine}` : f.resource}
                    </p>
                  </div>
                  <Badge tone="muted" size="sm">{f.scanner}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-[15px] font-semibold text-ink">Event log</h2>
        <Card className="overflow-hidden">
          <ol className="max-h-[360px] overflow-y-auto p-2">
            {run.events.map((e) => (
              <li key={e.id} className={cn("flex items-start gap-3 rounded-[7px] px-2 py-1.5", e.level === "phase" && "bg-surface-2/50")}>
                <span className="w-[68px] shrink-0 font-mono text-[11px] text-faint tabular">
                  {new Date(e.at).toISOString().slice(11, 19)}
                </span>
                <span className="w-[74px] shrink-0 font-mono text-[10.5px] uppercase text-faint">{e.scanner}</span>
                <span
                  className={cn(
                    "min-w-0 flex-1 text-[12.5px]",
                    e.level === "fail" ? "text-critical-ink" : e.level === "warn" ? "text-warning-ink" : "text-ink-2",
                  )}
                >
                  {e.message}
                  {e.path && <span className="ml-2 font-mono text-[11px] text-faint">{e.path}{e.line ? `:${e.line}` : ""}</span>}
                </span>
              </li>
            ))}
          </ol>
        </Card>
      </section>
    </div>
  );
}
