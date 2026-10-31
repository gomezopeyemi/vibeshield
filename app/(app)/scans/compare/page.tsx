import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { diffScans, getRun, listRuns } from "@/lib/scan-store";
import { cn, formatTime } from "@/lib/utils";
import { PILLARS, PILLAR_ORDER } from "@/lib/constants";
import type { Finding } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Compare scans" };
export const dynamic = "force-dynamic";

const delta = (n: number) => (n > 0 ? `+${n}` : String(n));

function Group({ title, tone, items, empty }: { title: string; tone: "critical" | "success" | "muted"; items: Finding[]; empty: string }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-line p-4">
        <span className={cn("size-2.5 rounded-full", tone === "critical" ? "bg-critical" : tone === "success" ? "bg-success" : "bg-faint")} />
        <h3 className="text-[14px] font-semibold text-ink">{title}</h3>
        <span className="ml-auto text-[12px] tabular text-muted">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="p-4 text-[12.5px] text-muted">{empty}</p>
      ) : (
        <ul>
          {items.map((f) => (
            <li key={f.id} className="flex items-start gap-3 border-b border-line p-4 last:border-0">
              <SeverityBadge severity={f.severity} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-medium text-ink">{f.title}</p>
                <p className="truncate font-mono text-[11.5px] text-muted">{f.context ? `${f.context.path}:${f.context.startLine}` : f.resource}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const runs = (await listRuns()).filter((r) => r.status === "completed");

  if (runs.length < 2 && !(from && to)) {
    return (
      <div className="space-y-6">
        <PageHeader title="Compare scans" description="See which findings were introduced, resolved or unchanged between two scans." />
        <Card>
          <EmptyState
            icon="GitMerge"
            title="You need two completed scans to compare"
            description="Run another scan and the differences — new, fixed and unchanged findings, plus score movement — will show up here."
            action={<Button asChild variant="primary"><Link href="/onboarding">Run a scan</Link></Button>}
          />
        </Card>
      </div>
    );
  }

  const toRun = to ? await getRun(to) : runs[0];
  const fromRun = from ? await getRun(from) : runs[1];
  if (!toRun || !fromRun) notFound();
  const d = diffScans(fromRun, toRun);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compare scans"
        description={`${formatTime(fromRun.finishedAt)} → ${formatTime(toRun.finishedAt)}`}
        actions={<Button asChild variant="secondary"><Link href="/scans"><Icon name="ChevronLeft" /> All scans</Link></Button>}
      />

      <div className="grid gap-3 sm:grid-cols-5">
        <Card className="p-4 sm:col-span-1">
          <p className="text-[12px] font-medium text-muted">Readiness</p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="text-[26px] font-semibold leading-none tabular text-ink">{toRun.score}</span>
            <span className={cn("text-[13px] font-semibold tabular", d.scoreDelta > 0 ? "text-success-ink" : d.scoreDelta < 0 ? "text-critical-ink" : "text-muted")}>
              {delta(d.scoreDelta)}
            </span>
          </p>
          <p className="mt-1 text-[11px] text-faint">was {fromRun.score}</p>
        </Card>
        {PILLAR_ORDER.map((p) => (
          <Card key={p} className="p-4">
            <p className="text-[12px] font-medium text-muted">{PILLARS[p].short}</p>
            <p className="mt-1 flex items-baseline gap-2">
              <span className="text-[22px] font-semibold leading-none tabular text-ink">{toRun.pillars[p]}</span>
              <span className={cn("text-[12px] font-semibold tabular", d.pillarDeltas[p] > 0 ? "text-success-ink" : d.pillarDeltas[p] < 0 ? "text-critical-ink" : "text-faint")}>
                {delta(d.pillarDeltas[p])}
              </span>
            </p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Group title="Introduced" tone="critical" items={d.introduced} empty="No new findings since the earlier scan." />
        <Group title="Resolved" tone="success" items={d.resolved} empty="Nothing was resolved between these scans." />
        <Group title="Unchanged" tone="muted" items={d.unchanged} empty="No findings carried over." />
      </div>
      <p className="text-[11.5px] text-faint">
        Findings are matched by rule, file and line. A finding that moved lines can appear as one resolved and one introduced.
      </p>
    </div>
  );
}
