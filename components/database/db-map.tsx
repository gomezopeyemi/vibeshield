"use client";

import { useState } from "react";
import Link from "next/link";
import { cn, timeAgo } from "@/lib/utils";
import type { DatabaseTable } from "@/lib/types";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/ui/code-block";
import { EmptyState } from "@/components/ui/empty-state";

function generateMigration(t: DatabaseTable): string | null {
  if (!t.rlsEnabled) {
    return `-- Enable RLS and add owner-scoped policies for ${t.schema}.${t.name}
alter table ${t.schema}.${t.name} enable row level security;

create policy "${t.name}_owner_select"
  on ${t.schema}.${t.name} for select
  using ( auth.uid() = user_id );

create policy "${t.name}_owner_modify"
  on ${t.schema}.${t.name} for update
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );`;
  }
  const permissive = t.policies.find((p) => p.permissive);
  if (permissive) {
    return `-- Replace permissive policy on ${t.schema}.${t.name}
drop policy "${permissive.name}" on ${t.schema}.${t.name};

create policy "${permissive.name}"
  on ${t.schema}.${t.name} for ${permissive.command.toLowerCase()}
  to ${permissive.roles.join(", ")}
  using ( auth.uid() = user_id );`;
  }
  return null;
}

function tableTone(t: DatabaseTable) {
  if (!t.rlsEnabled) return "critical";
  if (t.policies.some((p) => p.permissive)) return "warning";
  return "success";
}

export function DatabaseMap({ tables }: { tables: DatabaseTable[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(tables[0]?.id ?? null);
  const selected = tables.find((t) => t.id === selectedId) ?? null;

  if (tables.length === 0) {
    return (
      <EmptyState
        icon="Database"
        title="No database connected"
        description="Connect Supabase to inspect tables, RLS status and policies."
        tone="muted"
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
      {/* Node canvas */}
      <div className="rounded-[12px] border border-line bg-surface p-4 shadow-[0_1px_3px_rgba(16,24,40,0.04)]">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[13px] font-semibold text-ink">Schema topology</h3>
          <div className="flex items-center gap-3 text-[11px] text-muted">
            <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-success" /> RLS on</span>
            <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-warning" /> permissive</span>
            <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-critical" /> RLS off</span>
          </div>
        </div>
        <div className="grid-dots rounded-[10px] border border-line bg-surface-2/30 p-3">
          <div className="flex flex-wrap gap-2.5">
            {tables.map((t) => {
              const tone = tableTone(t);
              const active = t.id === selectedId;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={cn(
                    "min-w-[150px] flex-1 rounded-[10px] border bg-surface p-3 text-left transition-all",
                    active
                      ? "border-brand ring-2 ring-brand/15"
                      : "border-line hover:border-line-strong hover:shadow-[0_4px_12px_-4px_rgba(16,24,40,0.1)]",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[12.5px] font-medium text-ink">
                      <Icon name="Table2" className="size-3.5 text-faint" />
                      {t.name}
                    </span>
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        tone === "success" && "bg-success",
                        tone === "warning" && "bg-warning",
                        tone === "critical" && "bg-critical",
                      )}
                    />
                  </div>
                  <p className="mt-0.5 font-mono text-[10.5px] text-faint">{t.schema}</p>
                  <div className="mt-2 flex items-center gap-1.5 text-[10.5px] text-muted">
                    <Icon name={t.rlsEnabled ? "Lock" : "Unlock"} className="size-3" />
                    {t.rlsEnabled ? `${t.policies.length} ${t.policies.length === 1 ? "policy" : "policies"}` : "RLS disabled"}
                  </div>
                  {t.relations.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {t.relations.map((r) => (
                        <span key={r.to} className="inline-flex items-center gap-0.5 rounded-[5px] bg-surface-2 px-1 py-0.5 font-mono text-[9.5px] text-muted">
                          <Icon name="Link2" className="size-2.5" /> {r.to}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Inspector */}
      <div className="rounded-[12px] border border-line bg-surface shadow-[0_1px_3px_rgba(16,24,40,0.04)]">
        {selected ? <TableInspector table={selected} /> : null}
      </div>
    </div>
  );
}

function TableInspector({ table }: { table: DatabaseTable }) {
  const migration = generateMigration(table);
  const tone = tableTone(table);
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line p-4">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 font-mono text-[14px] font-semibold text-ink">
            <Icon name="Table2" className="size-4 text-muted" />
            {table.schema}.{table.name}
          </span>
          <Badge tone={tone === "success" ? "success" : tone === "warning" ? "warning" : "critical"} size="sm">
            {table.rlsEnabled ? (table.policies.some((p) => p.permissive) ? "Permissive policy" : "RLS enabled") : "RLS disabled"}
          </Badge>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-muted">
          {table.rowEstimate !== undefined && <span>~{table.rowEstimate.toLocaleString()} rows</span>}
          <span>{table.policies.length} policies</span>
          {table.lastInspectedAt && <span>Inspected {timeAgo(table.lastInspectedAt)}</span>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-faint">Policies</p>
        {table.policies.length === 0 ? (
          <div className="rounded-[9px] border border-critical-soft bg-critical-soft/40 px-3 py-2.5 text-[12px] text-critical-ink">
            No policies — with RLS off, this table is fully exposed to any authenticated user.
          </div>
        ) : (
          <div className="space-y-2">
            {table.policies.map((p) => (
              <div key={p.id} className="rounded-[9px] border border-line bg-surface-2/40 p-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[12px] font-medium text-ink">{p.name}</span>
                  <div className="flex items-center gap-1">
                    <Badge tone="neutral" size="sm">{p.command}</Badge>
                    {p.permissive && <Badge tone="warning" size="sm">permissive</Badge>}
                  </div>
                </div>
                <div className="mt-1.5 space-y-0.5 font-mono text-[11px] text-muted">
                  <p>roles: {p.roles.join(", ")}</p>
                  {p.using && <p>using: <span className={p.permissive ? "text-critical-ink" : "text-ink-2"}>{p.using}</span></p>}
                  {p.withCheck && <p>with check: {p.withCheck}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {table.findingIds.length > 0 && (
          <Link
            href="/fix?pillar=security"
            className="mt-3 flex items-center gap-2 rounded-[9px] border border-warning-soft bg-warning-soft/40 px-3 py-2 text-[12px] font-medium text-warning-ink hover:brightness-95"
          >
            <Icon name="ShieldAlert" className="size-4" />
            {table.findingIds.length} open {table.findingIds.length === 1 ? "finding" : "findings"} — open Fix Workspace
            <Icon name="ArrowRight" className="ml-auto size-3.5" />
          </Link>
        )}

        {migration && (
          <div className="mt-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-faint">Suggested migration</p>
            <CodeBlock code={migration} language="sql" fileName={`migrations/fix_${table.name}.sql`} maxHeight={240} />
            <p className="mt-1.5 text-[11px] text-faint">
              Generated from the table&apos;s real structure. Review the ownership column before applying.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
