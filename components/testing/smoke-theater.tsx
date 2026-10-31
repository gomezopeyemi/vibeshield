"use client";

import { useState } from "react";
import { cn, formatTime, timeAgo } from "@/lib/utils";
import type { SmokeTestRun, SmokeTestStep } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { SmokePill } from "@/components/ui/status-pill";
import { CodeBlock } from "@/components/ui/code-block";
import { CopyButton } from "@/components/ui/copy-button";
import { ActionNotice } from "@/components/ui/action-notice";
import { useAction } from "@/lib/hooks/use-action";
import { Tabs, TabsList, TabPill, TabsContent } from "@/components/ui/tabs";

function stepIcon(s: SmokeTestStep["status"]) {
  switch (s) {
    case "passed": return { icon: "CheckCircle2" as const, cls: "text-success" };
    case "failed": return { icon: "XCircle" as const, cls: "text-critical" };
    case "running":
    case "starting": return { icon: "Loader2" as const, cls: "text-brand animate-spin" };
    case "timed-out": return { icon: "Clock" as const, cls: "text-warning-ink" };
    default: return { icon: "Circle" as const, cls: "text-faint" };
  }
}

function failurePrompt(step: SmokeTestStep, url?: string) {
  return `A Playwright smoke test failed on step "${step.name}"${url ? ` against ${url}` : ""}.

Failure:
${step.assertionsFailed?.map((a) => `- assertion failed: ${a}`).join("\n") ?? "- step did not complete"}
${step.consoleErrors?.length ? `\nConsole errors:\n${step.consoleErrors.map((e) => `- ${e}`).join("\n")}` : ""}
${step.stackTrace ? `\nStack trace:\n${step.stackTrace}` : ""}

Find the root cause in the code, fix it with a minimal change, and keep the rest of the flow working. Explain the fix.`;
}

export function SmokeTheater({ run }: { run: SmokeTestRun }) {
  const firstFailed = run.steps.find((s) => s.status === "failed");
  const [selectedId, setSelectedId] = useState<string>(
    firstFailed?.id ?? run.steps.find((s) => s.status === "running")?.id ?? run.steps[0]?.id,
  );
  const selected = run.steps.find((s) => s.id === selectedId) ?? run.steps[0];
  const smoke = useAction("/api/smoke");

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line p-4">
        <div className="flex items-center gap-2">
          <h2 className="text-[14px] font-semibold text-ink">Application smoke test</h2>
          <SmokePill status={run.status} solid />
        </div>
        <div className="flex items-center gap-2">
          {run.deploymentUrl && (
            <span className="hidden items-center gap-1 font-mono text-[11px] text-muted sm:inline-flex">
              <Icon name="Globe" className="size-3" /> {run.deploymentUrl.replace("https://", "")}
            </span>
          )}
          <Button size="sm" variant="primary" disabled={smoke.status === "pending"} onClick={() => smoke.run({ deploymentUrl: run.deploymentUrl })}>
            {smoke.status === "pending" ? <><Icon name="Loader2" className="animate-spin" /> Starting…</> : <><Icon name="Play" /> Run tests</>}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr]">
        {/* Steps */}
        <div className="border-b border-line p-3 lg:border-b-0 lg:border-r">
          <ol className="space-y-1">
            {run.steps.map((s, i) => {
              const m = stepIcon(s.status);
              const active = s.id === selectedId;
              return (
                <li key={s.id}>
                  <button
                    onClick={() => setSelectedId(s.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left transition-colors",
                      active ? "bg-surface-2" : "hover:bg-surface-2/60",
                    )}
                  >
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-surface text-[10px] font-semibold text-muted">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-medium text-ink">{s.name}</span>
                      <span className="text-[10.5px] text-faint">
                        {s.durationMs ? `${(s.durationMs / 1000).toFixed(1)}s` : s.status}
                      </span>
                    </span>
                    <Icon name={m.icon} className={cn("size-4 shrink-0", m.cls)} />
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="mt-2 border-t border-line pt-2">
            <ActionNotice status={smoke.status} response={smoke.response} />
          </div>
        </div>

        {/* Detail */}
        <div className="p-4">
          <Tabs defaultValue="replay">
            <div className="flex items-center justify-between">
              <TabsList variant="pill">
                <TabPill value="replay"><Icon name="MonitorPlay" className="size-3.5" /> Browser replay</TabPill>
                <TabPill value="logs"><Icon name="Terminal" className="size-3.5" /> Test logs</TabPill>
              </TabsList>
              <SmokePill status={selected.status} />
            </div>

            <TabsContent value="replay" className="mt-3">
              <BrowserReplay step={selected} url={run.deploymentUrl} />
            </TabsContent>

            <TabsContent value="logs" className="mt-3">
              <StepLogs step={selected} url={run.deploymentUrl} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Card>
  );
}

function BrowserReplay({ step, url }: { step: SmokeTestStep; url?: string }) {
  return (
    <div className="overflow-hidden rounded-[10px] border border-line">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-3 py-1.5">
        <span className="flex gap-1">
          <span className="size-2 rounded-full bg-critical/60" />
          <span className="size-2 rounded-full bg-warning/60" />
          <span className="size-2 rounded-full bg-success/60" />
        </span>
        <span className="truncate rounded-[5px] bg-surface px-2 py-0.5 font-mono text-[10.5px] text-muted">
          {url ?? "preview"}/{step.name.toLowerCase().includes("log") ? "login" : "dashboard"}
        </span>
      </div>
      {/* Viewport */}
      <div className="relative flex min-h-[220px] items-center justify-center bg-gradient-to-b from-surface to-surface-2 p-6">
        {step.status === "running" || step.status === "starting" ? (
          <div className="flex flex-col items-center gap-2 text-muted">
            <Icon name="Loader2" className="size-6 animate-spin text-brand" />
            <p className="text-[12px]">Executing “{step.name}”…</p>
          </div>
        ) : step.status === "queued" ? (
          <div className="flex flex-col items-center gap-2 text-faint">
            <Icon name="Clock" className="size-6" />
            <p className="text-[12px]">Queued</p>
          </div>
        ) : (
          <div className="w-full max-w-xs rounded-[10px] border border-line bg-surface p-4 shadow-sm">
            <div className="mx-auto mb-3 flex size-8 items-center justify-center rounded-[8px] bg-brand-soft">
              <Icon name="Lock" className="size-4 text-brand" />
            </div>
            <p className="text-center text-[13px] font-semibold text-ink">Welcome back</p>
            <div className="mt-3 space-y-2">
              <div className="h-7 rounded-[6px] border border-line bg-surface-2" />
              <div className="h-7 rounded-[6px] border border-line bg-surface-2" />
              <div className={cn("h-7 rounded-[6px]", step.status === "failed" ? "bg-critical/20" : "bg-brand")} />
            </div>
          </div>
        )}
        <Badge tone="warning" size="sm" className="absolute right-2 top-2">Demo preview</Badge>
      </div>
      {step.status === "failed" && <FailureSummary step={step} url={url} />}
    </div>
  );
}

function FailureSummary({ step, url }: { step: SmokeTestStep; url?: string }) {
  return (
    <div className="space-y-3 border-t border-line bg-critical-soft/20 p-4">
      <div className="flex items-start gap-2">
        <Icon name="XCircle" className="mt-0.5 size-4 shrink-0 text-critical" />
        <div>
          <p className="text-[13px] font-semibold text-ink">What went wrong</p>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-2">
            The “{step.name}” step failed: the expected success state never appeared. This usually means the action
            threw an error before completing.
          </p>
        </div>
      </div>
      {step.stackTrace && (
        <CodeBlock code={step.stackTrace} language="bash" fileName="stack trace" showCopy maxHeight={140} />
      )}
      <CopyButton value={failurePrompt(step, url)} label="Copy AI fix prompt" />
    </div>
  );
}

function StepLogs({ step, url }: { step: SmokeTestStep; url?: string }) {
  const lines: string[] = [
    `▶ ${step.name}`,
    url ? `  navigating ${url}` : "  navigating preview",
  ];
  if (step.status === "passed") {
    lines.push("  ✓ assertion passed", `  done in ${(step.durationMs! / 1000).toFixed(1)}s`);
  } else if (step.status === "failed") {
    step.assertionsFailed?.forEach((a) => lines.push(`  ✗ ${a}`));
    step.consoleErrors?.forEach((e) => lines.push(`  console.error: ${e}`));
  } else if (step.status === "running") {
    lines.push("  … in progress");
  } else {
    lines.push("  queued");
  }
  return <CodeBlock code={lines.join("\n")} language="bash" showCopy maxHeight={220} />;
}

export function DeploymentGate() {
  return (
    <Card className="flex items-center justify-between p-4">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-[9px] bg-surface-2">
          <Icon name="ShieldCheck" className="size-4 text-muted" />
        </span>
        <div>
          <p className="text-[13px] font-semibold text-ink">CI/CD deployment gate</p>
          <p className="text-[11.5px] text-muted">Blocks deploys when smoke tests fail — enforced by the connected gatekeeper.</p>
        </div>
      </div>
      <Badge tone="muted" size="md">
        <Icon name="PlugZap" className="!size-3" /> Not connected
      </Badge>
    </Card>
  );
}

export function SmokeHistory({ runs }: { runs: SmokeTestRun[] }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line p-4">
        <h2 className="text-[14px] font-semibold text-ink">Run history</h2>
      </div>
      <ul>
        {runs.map((r) => {
          const passed = r.steps.filter((s) => s.status === "passed").length;
          return (
            <li key={r.id} className="flex items-center gap-3 border-b border-line p-4 last:border-0">
              <SmokePill status={r.status} solid />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] text-ink">
                  {passed}/{r.steps.length} steps passed
                </p>
                <p className="text-[11px] text-faint">
                  {r.startedAt ? formatTime(r.startedAt) : "—"} · {r.startedAt ? timeAgo(r.startedAt) : ""}
                </p>
              </div>
              {r.durationMs && <span className="font-mono text-[11px] text-muted">{(r.durationMs / 1000).toFixed(0)}s</span>}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
