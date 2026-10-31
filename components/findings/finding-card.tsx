"use client";

import { cn } from "@/lib/utils";
import type { Finding, PullRequest } from "@/lib/types";
import { PILLARS } from "@/lib/constants";
import { generateFixPrompt } from "@/lib/prompts";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { CopyButton } from "@/components/ui/copy-button";
import { PrStatusChip } from "./pr-status";

export type FixTab = "code" | "prompt" | "pr" | "history";

export function FindingCard({
  finding,
  pr,
  onOpen,
  rank,
}: {
  finding: Finding;
  pr?: PullRequest;
  onOpen: (f: Finding, tab?: FixTab) => void;
  rank?: number;
}) {
  const pillar = PILLARS[finding.pillar];
  return (
    <div className="rounded-[12px] border border-line bg-surface shadow-[0_1px_3px_rgba(16,24,40,0.04)] transition-shadow hover:shadow-[0_4px_12px_-2px_rgba(16,24,40,0.07)]">
      {/* Header */}
      <div className="flex items-start gap-3 p-4">
        {rank !== undefined && (
          <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[11px] font-semibold text-muted tabular">
            {rank}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <SeverityBadge severity={finding.severity} size="sm" />
            <Badge tone="neutral" size="sm">
              <Icon name={pillar.icon as "ShieldCheck"} className="!size-3" />
              {pillar.short}
            </Badge>
            {pr && <PrStatusChip state={pr.state} number={pr.number} />}
            <span className="flex-1" />
            {finding.scoreDelta !== undefined && (
              <Badge tone="brand" size="sm" className="font-semibold">
                +{finding.scoreDelta} pts
              </Badge>
            )}
          </div>
          <button
            onClick={() => onOpen(finding)}
            className="mt-2 block text-left text-[14.5px] font-semibold leading-snug text-ink hover:text-brand-ink"
          >
            {finding.title}
          </button>
        </div>
      </div>

      {/* PART 1 — Human translation */}
      <div className="px-4">
        <p className="text-[13px] leading-relaxed text-ink-2">{finding.humanSummary}</p>
        <div className="mt-2 flex items-start gap-2 rounded-[9px] bg-critical-soft/40 px-3 py-2">
          <Icon name="AlertTriangle" className="mt-0.5 size-3.5 shrink-0 text-critical" />
          <p className="text-[12px] leading-relaxed text-critical-ink">
            <span className="font-semibold">Real-world impact:</span> {finding.businessImpact}
          </p>
        </div>
      </div>

      {/* PART 2 — Live technical context */}
      <div className="mx-4 mt-3 overflow-hidden rounded-[9px] border border-line bg-surface-2/50">
        <div className="flex items-center gap-2 border-b border-line px-3 py-1.5">
          <Icon name="FileCode" className="size-3.5 text-faint" />
          <span className="truncate font-mono text-[11.5px] text-ink-2">
            {finding.context
              ? `${finding.context.path}${finding.context.startLine ? `:${finding.context.startLine}` : ""}`
              : finding.resource}
          </span>
          <span className="flex-1" />
          <span className="hidden items-center gap-1 text-[10.5px] text-faint sm:inline-flex">
            <Icon name="Radio" className="size-3 text-success" /> live repository content
          </span>
        </div>
        <div className="px-3 py-2">
          <p className="font-mono text-[11px] leading-relaxed text-muted">{finding.evidence}</p>
        </div>
      </div>

      {/* PART 3 — Immediate relief */}
      <div className="flex flex-wrap items-center gap-2 p-4">
        <Button size="sm" variant="primary" onClick={() => onOpen(finding, "pr")}>
          <Icon name="GitPullRequest" /> Open 1-Click Fix PR
        </Button>
        <CopyButton value={generateFixPrompt(finding, "cursor")} label="Copy AI fix prompt" />
        <Button size="sm" variant="secondary" onClick={() => onOpen(finding, "code")}>
          <Icon name="Code2" /> View diff
        </Button>
        <button
          onClick={() => onOpen(finding)}
          className="ml-auto inline-flex items-center gap-1 text-[12.5px] font-medium text-brand hover:text-brand-ink"
        >
          Open workspace <Icon name="ArrowRight" className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
