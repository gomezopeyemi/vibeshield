import type { Metadata } from "next";
import { getFindings, getPullRequests } from "@/lib/data";
import { PILLAR_ORDER } from "@/lib/constants";
import type { Pillar, Severity } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { DataBanner } from "@/components/ui/data-banner";
import { OriginPill } from "@/components/ui/status-pill";
import { FindingList } from "@/components/findings/finding-list";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Fix Workspace" };

const SEV_TILE: { sev: Severity; label: string; cls: string }[] = [
  { sev: "critical", label: "Critical", cls: "text-critical-ink" },
  { sev: "high", label: "High", cls: "text-critical-ink" },
  { sev: "medium", label: "Medium", cls: "text-warning-ink" },
  { sev: "low", label: "Low", cls: "text-muted" },
];

export default async function FixPage({
  searchParams,
}: {
  searchParams: Promise<{ pillar?: string }>;
}) {
  const [{ pillar }, findingsEnv, prsEnv] = await Promise.all([
    searchParams,
    getFindings(),
    getPullRequests(),
  ]);
  const findings = findingsEnv.data;
  const initialPillar = (PILLAR_ORDER as string[]).includes(pillar ?? "")
    ? (pillar as Pillar)
    : "all";

  const counts = SEV_TILE.map((t) => ({
    ...t,
    count: findings.filter((f) => f.severity === t.sev).length,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fix Workspace"
        description="Resolve findings without needing to understand every security concept. Each fix comes with a plain-English explanation, the exact code, a 1-click PR and a tailored AI prompt."
        badge={<OriginPill origin={findingsEnv.origin} />}
      />

      <DataBanner origin={findingsEnv.origin} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {counts.map((c) => (
          <div key={c.sev} className="rounded-[11px] border border-line bg-surface p-4">
            <p className="text-[12px] font-medium text-muted">{c.label}</p>
            <p className={cn("mt-1 text-[24px] font-semibold leading-none tabular", c.cls)}>{c.count}</p>
          </div>
        ))}
      </div>

      <FindingList findings={findings} pullRequests={prsEnv.data} variant="full" initialPillar={initialPillar} />
    </div>
  );
}
