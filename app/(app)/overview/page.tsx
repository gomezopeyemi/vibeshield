import type { Metadata } from "next";
import { getReadiness, getFindings, getPullRequests, getVerification } from "@/lib/data";
import { PageHeader } from "@/components/ui/page-header";
import { DataBanner } from "@/components/ui/data-banner";
import { OriginPill } from "@/components/ui/status-pill";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { LineChart } from "@/components/ui/line-chart";
import { ReadinessScoreCard } from "@/components/overview/readiness-score-card";
import { PillarCards } from "@/components/overview/pillar-cards";
import { VerificationCard } from "@/components/overview/verification-card";
import { FindingList } from "@/components/findings/finding-list";
import Link from "next/link";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const [readinessEnv, findingsEnv, prsEnv, verificationEnv] = await Promise.all([
    getReadiness(),
    getFindings(),
    getPullRequests(),
    getVerification(),
  ]);

  const readiness = readinessEnv.data;
  const findings = findingsEnv.data;
  const prs = prsEnv.data;
  const verification = verificationEnv.data;

  const openFindings = findings.filter((f) => f.status !== "resolved" && f.status !== "dismissed");
  const criticalCount = openFindings.filter((f) => f.severity === "critical").length;
  const prevScore = readiness.history.at(-2)?.score;
  const latestScore = readiness.history.at(-1)?.score ?? readiness.score;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Command Center"
        description="A live picture of your application's production readiness — scores, risks and the fastest path to launch."
        badge={<OriginPill origin={readinessEnv.origin} />}
        actions={
          <>
            <Button asChild variant="secondary" size="md">
              <Link href="/scans"><Icon name="ScanLine" /> Scan history</Link>
            </Button>
            <Button asChild variant="primary" size="md">
              <Link href="/onboarding"><Icon name="Radar" /> New scan</Link>
            </Button>
          </>
        }
      />

      <DataBanner origin={readinessEnv.origin} lastUpdatedAt={readinessEnv.lastUpdatedAt} />

      {/* Score + history */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <ReadinessScoreCard readiness={readiness} />
        </div>
        <Card className="flex flex-col p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-ink">Score history</h2>
            <span className="text-[11.5px] text-muted">last {readiness.history.length} scans</span>
          </div>
          <div className="mt-4 flex-1">
            <LineChart data={readiness.history} height={132} />
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-[12px]">
            <div>
              <p className="text-faint">Previous</p>
              <p className="font-semibold text-ink tabular">{prevScore ?? "—"}</p>
            </div>
            <Icon name="ArrowRight" className="size-4 text-faint" />
            <div className="text-right">
              <p className="text-faint">Current</p>
              <p className="font-semibold text-ink tabular">{latestScore}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Pillars */}
      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">Readiness pillars</h2>
            <p className="text-[12.5px] text-muted">Four dimensions of launch readiness. Select one to see its findings.</p>
          </div>
        </div>
        <PillarCards pillars={readiness.pillars} />
      </section>

      {/* Fix queue + verification */}
      <div className="grid gap-4 lg:grid-cols-5">
        <section className="space-y-3 lg:col-span-3">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-ink">
                Top fixes{" "}
                <span className="text-muted">
                  ({Math.min(4, openFindings.length)} of {openFindings.length})
                </span>
              </h2>
              <p className="text-[12.5px] text-muted">Prioritized by severity and score impact.</p>
            </div>
            <Link href="/fix" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-brand hover:text-brand-ink">
              View all <Icon name="ArrowRight" className="size-3.5" />
            </Link>
          </div>
          <FindingList findings={openFindings} pullRequests={prs} variant="queue" limit={4} />
        </section>

        <div className="space-y-4 lg:col-span-2">
          <VerificationCard verification={verification} criticalCount={criticalCount} />
          <RecentActivity prs={prs} />
        </div>
      </div>
    </div>
  );
}

function RecentActivity({ prs }: { prs: { id: string; number: number; title: string; state: string; openedAt: string }[] }) {
  return (
    <Card className="p-5">
      <h2 className="text-[14px] font-semibold text-ink">Remediation activity</h2>
      <ul className="mt-3 space-y-3">
        {prs.map((pr) => (
          <li key={pr.id} className="flex items-start gap-2.5">
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-2">
              <Icon name="GitPullRequest" className="size-3.5 text-muted" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] text-ink">{pr.title}</p>
              <p className="text-[11px] text-faint">PR #{pr.number} · {pr.state} · {timeAgo(pr.openedAt)}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
