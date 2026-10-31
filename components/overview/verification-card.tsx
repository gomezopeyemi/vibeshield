"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { VerificationBadge } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { LogoMark } from "@/components/shell/logo";
import { formatTime } from "@/lib/utils";

export function VerificationCard({
  verification,
  criticalCount,
}: {
  verification: VerificationBadge;
  criticalCount: number;
}) {
  const [showEmbed, setShowEmbed] = useState(false);
  const verified = verification.state === "verified";
  const score = verification.score ?? 0;

  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-ink">Verification badge</h2>
        <Badge tone={verified ? "success" : "muted"} size="sm">
          <Icon name={verified ? "ShieldCheck" : "ShieldQuestion"} className="!size-3" />
          {verified ? "Verified" : "Unverified"}
        </Badge>
      </div>

      {/* Live badge preview */}
      <div className="mt-3 flex items-center justify-center rounded-[10px] border border-line bg-surface-2/60 p-4">
        <div
          className={cn(
            "inline-flex items-center gap-2 rounded-[8px] border bg-surface px-3 py-2 shadow-[0_1px_2px_rgba(16,24,40,0.05)]",
            verified ? "border-success-soft" : "border-line opacity-80",
          )}
        >
          <LogoMark size={20} />
          <div className="leading-tight">
            <p className="text-[9px] font-medium uppercase tracking-wide text-faint">VibeShield</p>
            <p className="text-[12px] font-semibold text-ink">
              {verified ? `Readiness ${score}` : "Not verified"}
            </p>
          </div>
          <span className={cn("ml-1 size-2 rounded-full", verified ? "bg-success" : "bg-faint")} />
        </div>
      </div>

      {!verified && (
        <div className="mt-3 flex items-start gap-2 rounded-[9px] bg-warning-soft/50 px-3 py-2">
          <Icon name="Info" className="mt-0.5 size-3.5 shrink-0 text-warning-ink" />
          <p className="text-[12px] leading-relaxed text-warning-ink">
            A score alone does not verify an app.{" "}
            {criticalCount > 0
              ? `Resolve ${criticalCount} critical ${criticalCount === 1 ? "finding" : "findings"} to qualify for verification.`
              : "Verification is granted by the backend once remediation conditions are met."}
          </p>
        </div>
      )}

      <div className="mt-3 space-y-2">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-faint">Public URL</p>
          <div className="flex items-center gap-1.5 rounded-[8px] border border-line bg-surface px-2.5 py-1.5">
            <Icon name="Globe" className="size-3.5 shrink-0 text-faint" />
            <span className="flex-1 truncate font-mono text-[11.5px] text-ink-2">{verification.publicUrl}</span>
            <CopyButton value={verification.publicUrl ?? ""} />
          </div>
        </div>

        <button
          onClick={() => setShowEmbed((v) => !v)}
          className="flex w-full items-center justify-between rounded-[8px] px-0.5 py-1 text-[12px] font-medium text-brand hover:text-brand-ink"
        >
          <span>Embed code</span>
          <Icon name={showEmbed ? "ChevronDown" : "ChevronRight"} className="size-4" />
        </button>
        {showEmbed && (
          <div className="overflow-hidden rounded-[8px] border border-code-line bg-code-bg">
            <div className="flex items-center justify-between border-b border-code-line bg-code-bg-2 px-2.5 py-1.5">
              <span className="font-mono text-[11px] text-code-muted">HTML</span>
              <CopyButton value={verification.embedCode ?? ""} className="text-code-muted hover:text-code-text" />
            </div>
            <pre className="scroll-dark overflow-auto p-2.5 font-mono text-[10.5px] leading-relaxed text-code-text">
              {verification.embedCode}
            </pre>
          </div>
        )}
      </div>

      <div className="mt-auto flex items-center gap-2 pt-3 text-[11px] text-faint">
        {verified ? (
          <>
            <Icon name="Clock" className="size-3.5" />
            Verified {verification.verifiedAt ? formatTime(verification.verifiedAt) : "—"}
            {verification.expiresAt && ` · expires ${formatTime(verification.expiresAt)}`}
          </>
        ) : (
          <>
            <Icon name="ShieldQuestion" className="size-3.5" /> Verification status comes from backend conditions.
          </>
        )}
      </div>
    </Card>
  );
}
