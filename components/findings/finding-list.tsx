"use client";

import { useMemo, useState } from "react";
import type { Finding, PullRequest, Pillar, Severity } from "@/lib/types";
import { PILLAR_ORDER, PILLARS, SEVERITY } from "@/lib/constants";
import { SEVERITY as SEV } from "@/lib/constants";
import { FindingCard, type FixTab } from "./finding-card";
import { FixWorkspaceDrawer } from "./fix-workspace-drawer";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";

function severityRank(s: Severity) {
  return SEV[s].weight;
}

export function FindingList({
  findings,
  pullRequests = [],
  variant = "full",
  limit,
  initialPillar,
}: {
  findings: Finding[];
  pullRequests?: PullRequest[];
  variant?: "full" | "queue";
  limit?: number;
  initialPillar?: Pillar | "all";
}) {
  const [selected, setSelected] = useState<Finding | null>(null);
  const [tab, setTab] = useState<FixTab>("code");
  const [open, setOpen] = useState(false);

  const [query, setQuery] = useState("");
  const [pillar, setPillar] = useState<Pillar | "all">(initialPillar ?? "all");
  const [severity, setSeverity] = useState<Severity | "all">("all");

  const prByFinding = useMemo(() => {
    const map = new Map<string, PullRequest>();
    pullRequests.forEach((p) => map.set(p.findingId, p));
    return map;
  }, [pullRequests]);

  const sorted = useMemo(() => {
    let list = [...findings].sort((a, b) => {
      const sv = severityRank(b.severity) - severityRank(a.severity);
      if (sv !== 0) return sv;
      return (b.scoreDelta ?? 0) - (a.scoreDelta ?? 0);
    });
    if (variant === "full") {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (f) =>
          (pillar === "all" || f.pillar === pillar) &&
          (severity === "all" || f.severity === severity) &&
          (!q ||
            f.title.toLowerCase().includes(q) ||
            f.humanSummary.toLowerCase().includes(q) ||
            (f.resource ?? "").toLowerCase().includes(q)),
      );
    }
    if (limit) list = list.slice(0, limit);
    return list;
  }, [findings, variant, query, pillar, severity, limit]);

  const openFinding = (f: Finding, t: FixTab = "code") => {
    setSelected(f);
    setTab(t);
    setOpen(true);
  };

  return (
    <div className="space-y-3">
      {variant === "full" && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex-1">
            <Input
              icon="Search"
              placeholder="Search findings…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Select value={pillar} onValueChange={(v) => setPillar(v as Pillar | "all")}>
              <SelectTrigger size="sm" className="w-[150px]">
                <SelectValue placeholder="All pillars" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All pillars</SelectItem>
                {PILLAR_ORDER.map((p) => (
                  <SelectItem key={p} value={p}>
                    {PILLARS[p].short}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={severity} onValueChange={(v) => setSeverity(v as Severity | "all")}>
              <SelectTrigger size="sm" className="w-[130px]">
                <SelectValue placeholder="All severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severity</SelectItem>
                {(Object.keys(SEVERITY) as Severity[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {SEVERITY[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <EmptyState
          icon="ShieldCheck"
          title="No findings match"
          description="Adjust your filters, or run a new scan to refresh results."
          tone="muted"
        />
      ) : (
        <div className="space-y-3">
          {sorted.map((f, i) => (
            <FindingCard
              key={f.id}
              finding={f}
              pr={prByFinding.get(f.id)}
              onOpen={openFinding}
              rank={variant === "queue" ? i + 1 : undefined}
            />
          ))}
        </div>
      )}

      <FixWorkspaceDrawer
        finding={selected}
        pr={selected ? prByFinding.get(selected.id) : undefined}
        open={open}
        initialTab={tab}
        onOpenChange={setOpen}
      />
    </div>
  );
}
