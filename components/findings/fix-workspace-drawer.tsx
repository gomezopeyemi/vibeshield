"use client";

import { useEffect, useState } from "react";
import { cn, formatTime, timeAgo } from "@/lib/utils";
import type { Finding, PullRequest } from "@/lib/types";
import { PILLARS } from "@/lib/constants";
import { Dialog, SheetContent, DialogClose, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabPill, TabsContent } from "@/components/ui/tabs";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { DiffView } from "@/components/ui/diff-view";
import { CodeBlock } from "@/components/ui/code-block";
import { EmptyState } from "@/components/ui/empty-state";
import { ActionNotice } from "@/components/ui/action-notice";
import { useAction } from "@/lib/hooks/use-action";
import { AiPromptCustomizer } from "./ai-prompt";
import { PrStatusChip, PrChecks } from "./pr-status";
import type { FixTab } from "./finding-card";

const PR_STEPS = [
  "Generate proposed patch (Claude)",
  "Show affected files",
  "Show exact diff",
  "Validate patch",
  "Create GitHub Pull Request",
  "Track CI checks",
  "Track review & merge",
  "Re-scan after merge",
  "Update readiness & verification",
];

export function FixWorkspaceDrawer({
  finding,
  pr,
  open,
  initialTab = "code",
  onOpenChange,
}: {
  finding: Finding | null;
  pr?: PullRequest;
  open: boolean;
  initialTab?: FixTab;
  onOpenChange: (v: boolean) => void;
}) {
  const [tab, setTab] = useState<FixTab>(initialTab);
  useEffect(() => setTab(initialTab), [initialTab, finding?.id]);

  if (!finding) return null;
  const pillar = PILLARS[finding.pillar];
  const ctx = finding.context;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <SheetContent width="max-w-3xl">
        <DialogTitle className="sr-only">{finding.title}</DialogTitle>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-line bg-surface px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <SeverityBadge severity={finding.severity} size="sm" />
              <Badge tone="neutral" size="sm">
                <Icon name={pillar.icon as "ShieldCheck"} className="!size-3" /> {pillar.short}
              </Badge>
              {finding.scoreDelta !== undefined && (
                <Badge tone="brand" size="sm">+{finding.scoreDelta} pts on fix</Badge>
              )}
            </div>
            <h2 className="mt-1.5 text-[17px] font-semibold tracking-tight text-ink">
              {finding.title}
            </h2>
          </div>
          <DialogClose className="rounded-[7px] p-1.5 text-faint hover:bg-surface-2 hover:text-ink">
            <Icon name="X" className="size-4" />
          </DialogClose>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Finding details */}
          <div className="space-y-3 border-b border-line bg-surface px-5 py-4">
            <p className="text-[13.5px] leading-relaxed text-ink-2">{finding.humanSummary}</p>
            <div className="flex items-start gap-2 rounded-[10px] bg-critical-soft/40 px-3 py-2.5">
              <Icon name="AlertTriangle" className="mt-0.5 size-4 shrink-0 text-critical" />
              <p className="text-[12.5px] leading-relaxed text-critical-ink">
                <span className="font-semibold">Business impact:</span> {finding.businessImpact}
              </p>
            </div>
            <div className="grid gap-x-6 gap-y-2 text-[12.5px] sm:grid-cols-2">
              <Meta label="Scanner" value={finding.scanner} mono />
              <Meta label="Detected" value={timeAgo(finding.detectedAt)} />
              {finding.resource && <Meta label="Resource" value={finding.resource} mono />}
              {ctx && <Meta label="Location" value={`${ctx.path}:${ctx.startLine}`} mono />}
            </div>
            <div className="rounded-[10px] border border-line bg-surface-2/50 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">Scanner evidence</p>
              <p className="mt-1 font-mono text-[11.5px] text-ink-2">{finding.evidence}</p>
            </div>
            <div className="rounded-[10px] border border-brand-soft-2 bg-brand-soft/40 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-ink/80">Recommended remediation</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">{finding.recommendation}</p>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={tab} onValueChange={(v) => setTab(v as FixTab)} className="px-5 py-4">
            <TabsList variant="pill" className="mb-4">
              <TabPill value="code"><Icon name="Code2" className="size-3.5" /> Code &amp; Fix</TabPill>
              <TabPill value="prompt"><Icon name="Sparkles" className="size-3.5" /> AI Prompt</TabPill>
              <TabPill value="pr"><Icon name="GitPullRequest" className="size-3.5" /> GitHub PR</TabPill>
              <TabPill value="history"><Icon name="Clock" className="size-3.5" /> History</TabPill>
            </TabsList>

            <TabsContent value="code">
              <div className="mb-2 flex items-center gap-1.5 text-[11.5px] text-muted">
                <Icon name="Lock" className="size-3.5 text-faint" /> Secrets are redacted from all source previews.
              </div>
              {ctx?.proposed ? (
                <DiffView
                  original={ctx.snippet}
                  proposed={ctx.proposed}
                  language={ctx.language}
                  fileName={ctx.path}
                />
              ) : ctx ? (
                <CodeBlock code={ctx.snippet} language={ctx.language} fileName={ctx.path} startLine={ctx.startLine} />
              ) : (
                <EmptyState
                  icon="FileCode"
                  title="No code preview for this finding"
                  description={`This finding points to ${finding.resource ?? "a resource"} rather than a specific source range.`}
                />
              )}
            </TabsContent>

            <TabsContent value="prompt">
              <AiPromptCustomizer finding={finding} />
            </TabsContent>

            <TabsContent value="pr">
              <GithubRemediation finding={finding} pr={pr} />
            </TabsContent>

            <TabsContent value="history">
              <RemediationHistory finding={finding} pr={pr} />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Dialog>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted">{label}:</span>
      <span className={cn("truncate text-ink-2", mono && "font-mono text-[11.5px]")}>{value}</span>
    </div>
  );
}

function GithubRemediation({ finding, pr }: { finding: Finding; pr?: PullRequest }) {
  const { run, status, response } = useAction("/api/fix/pr");
  const pending = status === "pending";

  if (pr) {
    return (
      <div className="space-y-3">
        <div className="rounded-[11px] border border-line bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <PrStatusChip state={pr.state} number={pr.number} />
            <a
              href={pr.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[12px] font-medium text-brand hover:text-brand-ink"
            >
              View on GitHub <Icon name="ExternalLink" className="size-3" />
            </a>
          </div>
          <p className="mt-2 text-[13px] font-medium text-ink">{pr.title}</p>
          <p className="mt-0.5 font-mono text-[11.5px] text-muted">{pr.branch}</p>
          <div className="mt-3 border-t border-line pt-3">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-faint">Checks</p>
            <PrChecks pr={pr} />
          </div>
          <div className="mt-3 flex items-center gap-2 border-t border-line pt-3 text-[12px]">
            {pr.state === "merged" ? (
              <span className="inline-flex items-center gap-1.5 text-success-ink">
                <Icon name="GitMerge" className="size-4" /> Merged {pr.mergedAt ? timeAgo(pr.mergedAt) : ""} · re-scan verifies the fix
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-muted">
                <Icon name="Clock" className="size-4" /> Not merged yet — verification runs after merge, never before.
              </span>
            )}
          </div>
        </div>
        <p className="text-[11px] text-faint">Demo PR shown for illustration. New PRs require the connected GitHub App.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-[11px] border border-line bg-surface p-4">
        <p className="text-[13px] font-medium text-ink">Auto-Fix Pull Request</p>
        <p className="mt-0.5 text-[12.5px] text-muted">
          VibeShield prepares a minimal, validated patch and opens a PR you review before merging.
        </p>
        <ol className="mt-3 space-y-1.5">
          {PR_STEPS.map((s, i) => (
            <li key={i} className="flex items-center gap-2.5 text-[12.5px] text-ink-2">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[10.5px] font-semibold text-muted">
                {i + 1}
              </span>
              {s}
            </li>
          ))}
        </ol>
      </div>
      <Button variant="primary" className="w-full" disabled={pending} onClick={() => run({ findingId: finding.id })}>
        {pending ? (
          <><Icon name="Loader2" className="animate-spin" /> Preparing patch…</>
        ) : (
          <><Icon name="GitPullRequest" /> Open 1-Click Fix PR</>
        )}
      </Button>
      <ActionNotice status={status} response={response} />
    </div>
  );
}

function RemediationHistory({ finding, pr }: { finding: Finding; pr?: PullRequest }) {
  const events: { icon: "ScanLine" | "GitPullRequest" | "GitMerge" | "ShieldCheck"; label: string; at: string; tone?: string }[] = [
    { icon: "ScanLine", label: "Finding detected by scan", at: finding.detectedAt },
  ];
  if (pr) {
    events.push({ icon: "GitPullRequest", label: `PR #${pr.number} opened`, at: pr.openedAt });
    if (pr.mergedAt) {
      events.push({ icon: "GitMerge", label: `PR #${pr.number} merged`, at: pr.mergedAt, tone: "success" });
      events.push({ icon: "ShieldCheck", label: "Re-scan verified remediation", at: pr.mergedAt, tone: "success" });
    }
  }
  if (events.length === 1) {
    return (
      <EmptyState
        icon="Clock"
        title="No remediation history yet"
        description="Open a Fix PR or apply a prompt-based fix. Each action, PR and re-scan will appear here."
      />
    );
  }
  return (
    <ol className="relative ml-2 space-y-4 border-l border-line pl-5">
      {events
        .slice()
        .reverse()
        .map((e, i) => (
          <li key={i} className="relative">
            <span
              className={cn(
                "absolute -left-[26px] flex size-5 items-center justify-center rounded-full ring-4 ring-canvas",
                e.tone === "success" ? "bg-success-soft text-success" : "bg-surface-2 text-muted",
              )}
            >
              <Icon name={e.icon} className="size-3" />
            </span>
            <p className="text-[12.5px] font-medium text-ink">{e.label}</p>
            <p className="text-[11px] text-faint">{formatTime(e.at)}</p>
          </li>
        ))}
    </ol>
  );
}
