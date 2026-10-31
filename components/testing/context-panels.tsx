"use client";

import { useState } from "react";
import Link from "next/link";
import { cn, timeAgo } from "@/lib/utils";
import type {
  ContextFile,
  ContextAnalysis,
  MCPConnection,
  LegalDocState,
} from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { ConnectionPill } from "@/components/ui/status-pill";
import { CodeBlock } from "@/components/ui/code-block";
import { CopyButton } from "@/components/ui/copy-button";
import { ActionNotice } from "@/components/ui/action-notice";
import { useAction } from "@/lib/hooks/use-action";
import { BrandGlyph, type BrandName } from "@/components/ui/brand-glyph";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { generatePrivacyPolicy, generateTerms, generateGdprEndpoint } from "@/lib/legal";

/* ---- AI context files ---- */

const FILE_BRAND: Record<ContextFile["name"], BrandName> = {
  ".cursorrules": "cursor",
  ".windsurfrules": "windsurf",
  "CLAUDE.md": "claude",
};

export function ContextFiles({
  files,
  analysis,
}: {
  files: ContextFile[];
  analysis: ContextAnalysis;
}) {
  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="border-b border-line p-4">
          <h2 className="text-[14px] font-semibold text-ink">AI project instructions</h2>
          <p className="text-[12px] text-muted">Keep your AI tools aligned with your security guardrails.</p>
        </div>
        <ul>
          {files.map((f) => (
            <ContextFileRow key={f.id} file={f} />
          ))}
        </ul>
      </Card>

      <Card className="p-5">
        <h2 className="text-[14px] font-semibold text-ink">Context analysis</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <AnalysisStat icon="PackageX" label="Dead dependencies" value={analysis.deadDependencies} />
          <AnalysisStat icon="Layers" label="Duplicate components" value={analysis.duplicateComponents} />
          <AnalysisStat icon="FileWarning" label="Files > 2,000 lines" value={analysis.filesOver2000Lines} />
          <AnalysisStat icon="ShieldAlert" label="Missing security rules" value={analysis.missingSecurityRules} tone="warning" />
        </div>
      </Card>
    </div>
  );
}

function AnalysisStat({ icon, label, value, tone }: { icon: IconName; label: string; value: number; tone?: "warning" }) {
  return (
    <div className="rounded-[10px] border border-line bg-surface-2/40 p-3">
      <Icon name={icon} className={cn("size-4", tone === "warning" ? "text-warning-ink" : "text-faint")} />
      <p className="mt-2 text-[22px] font-semibold leading-none text-ink tabular">{value}</p>
      <p className="mt-1 text-[11px] text-muted">{label}</p>
    </div>
  );
}

function ContextFileRow({ file }: { file: ContextFile }) {
  const [open, setOpen] = useState(false);
  const { run, status, response } = useAction("/api/context/sync");
  const needsSync = file.syncStatus === "update-available" || file.syncStatus === "missing";

  return (
    <li className="border-b border-line last:border-0">
      <div className="flex items-center gap-3 p-4">
        <BrandGlyph name={FILE_BRAND[file.name]} size={18} className="text-ink-2" />
        <div className="min-w-0 flex-1">
          <span className="font-mono text-[13px] font-medium text-ink">{file.name}</span>
          <p className="text-[11px] text-faint">
            {file.currentVersion} · {file.lastCommitAt ? `committed ${timeAgo(file.lastCommitAt)}` : "no commits"}
          </p>
        </div>
        {file.syncStatus === "synced" ? (
          <Badge tone="success" size="sm"><Icon name="Check" className="!size-3" /> Synced</Badge>
        ) : file.syncStatus === "update-available" ? (
          <Badge tone="warning" size="sm">Update available</Badge>
        ) : file.syncStatus === "missing" ? (
          <Badge tone="critical" size="sm">Missing</Badge>
        ) : (
          <Badge tone="warning" size="sm">Conflict</Badge>
        )}
        {file.proposedDiff && (
          <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}>
            <Icon name={open ? "ChevronDown" : "ChevronRight"} /> Diff
          </Button>
        )}
      </div>
      {open && file.proposedDiff && (
        <div className="space-y-2 px-4 pb-4">
          <CodeBlock code={file.proposedDiff} language="markdown" fileName={`${file.name} (proposed additions)`} maxHeight={220} />
          {needsSync && (
            <>
              <Button size="sm" variant="primary" disabled={status === "pending"} onClick={() => run({ file: file.name })}>
                {status === "pending" ? <><Icon name="Loader2" className="animate-spin" /> Opening PR…</> : <><Icon name="GitPullRequest" /> Sync via PR</>}
              </Button>
              <ActionNotice status={status} response={response} />
            </>
          )}
        </div>
      )}
    </li>
  );
}

/* ---- MCP servers ---- */

const MCP_BRAND: Record<MCPConnection["client"], { brand: BrandName; label: string }> = {
  cursor: { brand: "cursor", label: "Cursor" },
  windsurf: { brand: "windsurf", label: "Windsurf" },
  "claude-code": { brand: "claude", label: "Claude Code" },
};

const MCP_CONFIG = `{
  "mcpServers": {
    "vibeshield": {
      "command": "npx",
      "args": ["-y", "@vibeshield/mcp"],
      "env": { "VIBESHIELD_TOKEN": "vs_•••••••••" }
    }
  }
}`;

export function McpPanel({ connections }: { connections: MCPConnection[] }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-3">
        {connections.map((c) => {
          const meta = MCP_BRAND[c.client];
          return (
            <Card key={c.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BrandGlyph name={meta.brand} size={18} className="text-ink-2" />
                  <span className="text-[13px] font-semibold text-ink">{meta.label}</span>
                </div>
                <ConnectionPill status={c.status} solid />
              </div>
              <dl className="mt-3 space-y-1.5 text-[11.5px]">
                <Row label="Version" value={`v${c.serverVersion}`} mono />
                <Row label="Last heartbeat" value={c.lastHeartbeatAt ? timeAgo(c.lastHeartbeatAt) : "—"} />
                <Row label="Last validation" value={c.lastValidationAt ? timeAgo(c.lastValidationAt) : "—"} />
              </dl>
              <div className="mt-3 flex flex-wrap gap-1">
                {c.capabilities.map((cap) => (
                  <Badge key={cap} tone="neutral" size="sm">{cap}</Badge>
                ))}
              </div>
              {c.recentEvents.some((e) => e.blocked) && (
                <div className="mt-3 space-y-1 border-t border-line pt-2">
                  {c.recentEvents.filter((e) => e.blocked).map((e, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[11px] text-critical-ink">
                      <Icon name="ShieldX" className="mt-0.5 size-3 shrink-0" />
                      <span>{e.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[13px] font-semibold text-ink">Setup configuration</h3>
            <p className="text-[12px] text-muted">Add the VibeShield MCP server to validate migrations and block hardcoded keys.</p>
          </div>
          <CopyButton value={MCP_CONFIG} label="Copy config" />
        </div>
        <div className="mt-3">
          <CodeBlock code={MCP_CONFIG} language="json" fileName="mcp.json" showCopy={false} maxHeight={200} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-[11.5px] text-muted">
          <span className="inline-flex items-center gap-1"><Icon name="ShieldCheck" className="size-3.5 text-success" /> Blocks RLS-dropping migrations</span>
          <span className="inline-flex items-center gap-1"><Icon name="KeyRound" className="size-3.5 text-success" /> Detects hardcoded keys before commit</span>
        </div>
      </Card>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className={cn("text-ink-2", mono && "font-mono")}>{value}</dd>
    </div>
  );
}

/* ---- Legal & compliance ---- */

export function LegalPanel({ legal }: { legal: LegalDocState }) {
  const [doc, setDoc] = useState<{ title: string; code: string; lang: string } | null>(null);

  const docs = [
    {
      key: "privacy",
      title: "Privacy Policy",
      icon: "BookLock" as IconName,
      gen: () => ({ title: "Privacy Policy (draft)", code: generatePrivacyPolicy(legal.detectedApis), lang: "markdown" }),
    },
    {
      key: "tos",
      title: "Terms of Service",
      icon: "Scale" as IconName,
      gen: () => ({ title: "Terms of Service (draft)", code: generateTerms(legal.detectedApis), lang: "markdown" }),
    },
    {
      key: "gdpr",
      title: "GDPR Delete Endpoint",
      icon: "FileLock2" as IconName,
      gen: () => ({ title: "Delete My Account endpoint (draft)", code: generateGdprEndpoint(), lang: "tsx" }),
    },
  ];

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="text-[13px] font-semibold text-ink">Detected third-party APIs</h3>
        <p className="text-[12px] text-muted">These integrations typically require disclosure in your legal documents.</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {legal.detectedApis.map((a) => (
            <Badge key={a} tone="neutral" size="md"><Icon name="Plug" className="!size-3" /> {a}</Badge>
          ))}
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        {docs.map((d) => (
          <Card key={d.key} className="flex flex-col p-4">
            <div className="flex size-9 items-center justify-center rounded-[9px] bg-brand-soft">
              <Icon name={d.icon} className="size-[18px] text-brand" />
            </div>
            <p className="mt-3 text-[13px] font-semibold text-ink">{d.title}</p>
            <p className="mt-0.5 flex-1 text-[11.5px] text-muted">Generate a draft from your detected integrations.</p>
            <Button size="sm" variant="secondary" className="mt-3" onClick={() => setDoc(d.gen())}>
              <Icon name="Sparkles" /> Generate draft
            </Button>
          </Card>
        ))}
      </div>

      <Dialog open={!!doc} onOpenChange={(v) => !v && setDoc(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{doc?.title}</DialogTitle>
          </DialogHeader>
          <div className="px-5 pb-5">
            <div className="mb-3 flex items-start gap-2 rounded-[9px] bg-warning-soft/50 px-3 py-2">
              <Icon name="Info" className="mt-0.5 size-3.5 shrink-0 text-warning-ink" />
              <p className="text-[11.5px] text-warning-ink">
                This is an automatically generated draft. Have it reviewed by a qualified professional before publishing.
              </p>
            </div>
            {doc && <CodeBlock code={doc.code} language={doc.lang} maxHeight={360} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
