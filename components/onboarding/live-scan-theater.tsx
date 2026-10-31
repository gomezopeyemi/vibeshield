"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ScanEvent, ScannerKind } from "@/lib/types";
import { Icon, type IconName } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/ui/status-pill";

const SCANNER_LABEL: Record<ScannerKind, string> = {
  gitleaks: "Gitleaks",
  semgrep: "Semgrep",
  "tree-sitter": "Tree-sitter",
  supabase: "Supabase",
  "live-url": "Live URL",
  nuclei: "Nuclei",
};

const LEVEL_ICON: Record<ScanEvent["level"], { icon: IconName; cls: string }> = {
  phase: { icon: "Radar", cls: "text-brand" },
  info: { icon: "Dot", cls: "text-faint" },
  check: { icon: "CheckCircle2", cls: "text-success" },
  warn: { icon: "AlertTriangle", cls: "text-warning-ink" },
  fail: { icon: "XCircle", cls: "text-critical" },
};

export type TheaterStatus = "idle" | "running" | "completed" | "failed";

export interface ScanSummary {
  score: number;
  findingCount: number;
  fileCount: number;
  durationMs: number;
  label: string;
}

export function LiveScanTheater({
  events,
  status,
  elapsed,
  summary,
  starting,
  onStart,
}: {
  events: ScanEvent[];
  status: TheaterStatus;
  elapsed: number;
  summary: ScanSummary | null;
  starting: boolean;
  onStart: () => void;
}) {
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [events.length]);

  const last = events[events.length - 1];
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(Math.floor(elapsed % 60)).padStart(2, "0");

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[12px] border border-line bg-surface shadow-[0_1px_3px_rgba(16,24,40,0.04)]">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-[14px] font-semibold text-ink">Live Scan Theater</h2>
          {status === "running" ? (
            <StatusPill tone="info" label="Running" pulse solid />
          ) : status === "completed" ? (
            <StatusPill tone="success" label="Completed" solid />
          ) : status === "failed" ? (
            <StatusPill tone="critical" label="Failed" solid />
          ) : (
            <StatusPill tone="muted" label="Queued" solid />
          )}
        </div>
        <Badge tone="success" size="sm"><Icon name="Radio" className="!size-3" /> Real scan</Badge>
      </div>

      <div className="flex items-center justify-between border-b border-line bg-surface-2/40 px-4 py-2 text-[11.5px]">
        <span className="truncate font-mono text-muted">
          {summary?.label ?? (last ? "scanning…" : "sample/vulnerable-app @ main")}
        </span>
        <span className="font-mono tabular text-ink-2">{mm}:{ss} elapsed</span>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-line px-4 py-2.5">
        {(["gitleaks", "semgrep", "tree-sitter", "supabase", "live-url"] as ScannerKind[]).map((s) => {
          const seen = events.some((e) => e.scanner === s);
          const active = status === "running" && last?.scanner === s;
          return (
            <span
              key={s}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
                active ? "border-brand-soft-2 bg-brand-soft text-brand-ink"
                  : seen ? "border-success-soft bg-success-soft text-success-ink"
                    : "border-line bg-surface text-faint",
              )}
            >
              {active ? <Icon name="Loader2" className="size-3 animate-spin" />
                : seen ? <Icon name="Check" className="size-3" />
                  : <span className="size-1.5 rounded-full bg-faint" />}
              {SCANNER_LABEL[s]}
            </span>
          );
        })}
      </div>

      <div ref={logRef} className="min-h-[260px] flex-1 overflow-y-auto px-2 py-2">
        {events.length === 0 ? (
          <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-3 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-brand-soft">
              <Icon name="Radar" className="size-5 text-brand" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-ink">Ready to scan</p>
              <p className="mt-0.5 max-w-xs text-[12px] text-muted">
                Runs the real analyzer (Gitleaks · Semgrep · Tree-sitter · Supabase) and streams findings as they&apos;re discovered.
              </p>
            </div>
            <Button variant="primary" size="sm" disabled={starting} onClick={onStart}>
              {starting ? <><Icon name="Loader2" className="animate-spin" /> Starting…</> : <><Icon name="Play" /> Run scan</>}
            </Button>
          </div>
        ) : (
          <ol className="space-y-0.5">
            {events.map((e) => {
              const li = LEVEL_ICON[e.level];
              return (
                <li key={e.id} className={cn("flex items-start gap-2.5 rounded-[7px] px-2 py-1.5", e.level === "phase" && "bg-surface-2/50")}>
                  <Icon name={li.icon} className={cn("mt-0.5 size-3.5 shrink-0", li.cls)} />
                  <div className="min-w-0 flex-1">
                    <span className="text-[12.5px] text-ink-2">{e.message}</span>
                    {e.path && (
                      <span className="block font-mono text-[11px] text-faint">{e.path}{e.line ? `:${e.line}` : ""}</span>
                    )}
                  </div>
                  <span className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-faint">{SCANNER_LABEL[e.scanner]}</span>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {status === "completed" && summary && (
        <div className="flex items-center justify-between border-t border-line px-4 py-3">
          <div className="flex items-center gap-2 text-[12.5px]">
            <Icon name="CheckCircle2" className="size-4 text-success" />
            <span className="font-medium text-ink">Scan complete</span>
            <span className="text-muted">· {summary.findingCount} findings · {summary.fileCount} files · readiness {summary.score}</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={onStart}><Icon name="RotateCw" /> Re-run</Button>
            <Button asChild size="sm" variant="primary"><Link href="/overview"><Icon name="LayoutDashboard" /> View results</Link></Button>
          </div>
        </div>
      )}
      {status === "failed" && (
        <div className="flex items-center gap-2 border-t border-line px-4 py-3 text-[12.5px] text-critical-ink">
          <Icon name="XCircle" className="size-4 text-critical" /> Scan failed — see the log above.
        </div>
      )}
    </div>
  );
}
