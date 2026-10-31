import type { Metadata } from "next";
import Link from "next/link";
import { getFinOps } from "@/lib/data";
import { PROVIDERS } from "@/lib/constants";
import { PageHeader } from "@/components/ui/page-header";
import { DataBanner } from "@/components/ui/data-banner";
import { OriginPill } from "@/components/ui/status-pill";
import { Card } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { Icon, type IconName } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { LoopGraphView } from "@/components/finops/loop-graph";
import { RateLimitForm } from "@/components/finops/rate-limit-form";
import { KillSwitch } from "@/components/finops/kill-switch";

export const metadata: Metadata = { title: "FinOps Monitor" };

export default async function FinOpsPage() {
  const env = await getFinOps();
  const { rateLimit, signals, loopGraph, providerUsage } = env.data;
  const routes = signals.filter((s) => s.kind === "unprotected-route");
  const loops = signals.filter((s) => s.kind === "infinite-loop");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Denial-of-Wallet & FinOps Monitor"
        description="Protect against runaway spend from infinite loops and unthrottled paid API routes."
        badge={<OriginPill origin={env.origin} />}
      />

      <DataBanner origin={env.origin} note={env.note} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Detected loop risks" value={loops.length} icon="RotateCw" sub="from static analysis" />
        <Stat label="Unprotected routes" value={routes.length} icon="ShieldAlert" sub="paid providers" />
        <Stat label="Rate limit" value={`${rateLimit.requestsPerMinute}/min`} icon="Gauge" sub={rateLimit.enabled ? "configured" : "disabled"} />
        <Stat label="Spend exposure" empty emptyLabel="Telemetry not connected" icon="CircleDollarSign" />
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[14px] font-semibold text-ink">API &amp; provider usage</h2>
            <p className="text-[12px] text-muted">Connect a provider to see real request volume and spend.</p>
          </div>
          <Link href="/integrations" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-brand hover:text-brand-ink">
            Connect provider <Icon name="ArrowRight" className="size-3.5" />
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {providerUsage.map((p) => (
            <div key={p.provider} className="flex items-center gap-2 rounded-[9px] border border-line bg-surface-2/40 px-3 py-2.5">
              <Icon name={PROVIDERS[p.provider].icon as IconName} className="size-4 text-faint" />
              <div className="min-w-0">
                <p className="truncate text-[12px] font-medium text-ink">{PROVIDERS[p.provider].label}</p>
                <p className="text-[10.5px] text-faint">{p.connected ? `${p.requests ?? 0} req` : "Not connected"}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <Icon name="RotateCw" className="size-4 text-brand" />
          <h2 className="text-[14px] font-semibold text-ink">Infinite React loop detection</h2>
        </div>
        <LoopGraphView graph={loopGraph} />
        <div className="mt-4 space-y-2">
          {loops.map((s) => (
            <Link
              key={s.id}
              href="/fix?pillar=finops"
              className="flex items-center gap-3 rounded-[9px] border border-line bg-surface p-3 transition-colors hover:bg-surface-2"
            >
              <SeverityBadge severity={s.severity} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-ink">{s.title}</p>
                <p className="truncate font-mono text-[11px] text-muted">{s.path}:{s.line}</p>
              </div>
              <Badge tone={s.confirmedRuntime ? "critical" : "warning"} size="sm">
                {s.confirmedRuntime ? "Confirmed runtime" : "Static potential"}
              </Badge>
              <Icon name="ArrowRight" className="size-4 text-faint" />
            </Link>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b border-line p-5 pb-4">
          <Icon name="ShieldAlert" className="size-4 text-warning-ink" />
          <h2 className="text-[14px] font-semibold text-ink">Unprotected API routes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-line text-[11px] uppercase tracking-wide text-faint">
                <th className="px-5 py-2.5 font-medium">Route</th>
                <th className="px-3 py-2.5 font-medium">Provider</th>
                <th className="px-3 py-2.5 font-medium">Auth</th>
                <th className="px-3 py-2.5 font-medium">Rate limit</th>
                <th className="px-3 py-2.5 font-medium">Fix</th>
              </tr>
            </thead>
            <tbody>
              {routes.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0 hover:bg-surface-2/40">
                  <td className="px-5 py-3">
                    <span className="font-mono text-ink-2">{r.path.replace("src/app", "").replace("/route.ts", "")}</span>
                  </td>
                  <td className="px-3 py-3">
                    {r.provider ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Icon name={PROVIDERS[r.provider].icon as IconName} className="size-3.5 text-faint" />
                        {PROVIDERS[r.provider].label}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-3">
                    {r.id === "sig_route_ai" ? (
                      <Badge tone="critical" size="sm">No auth</Badge>
                    ) : (
                      <Badge tone="success" size="sm">Auth OK</Badge>
                    )}
                  </td>
                  <td className="px-3 py-3"><Badge tone="critical" size="sm">No rate limit</Badge></td>
                  <td className="px-3 py-3">
                    <Link href="/fix?pillar=finops" className="inline-flex items-center gap-1 font-medium text-brand hover:text-brand-ink">
                      Fix <Icon name="ArrowRight" className="size-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <RateLimitForm config={rateLimit} />
        <KillSwitch config={rateLimit.dailySpendKillSwitch} />
      </div>
    </div>
  );
}
