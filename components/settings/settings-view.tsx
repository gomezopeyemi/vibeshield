"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/auth/actions";
import { useSession } from "@/components/providers";
import { PLANS, PLAN_RANK } from "@/lib/constants";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { WorkspaceSettingsForm } from "@/components/workspaces/workspace-settings-form";
import type { WorkspaceMember } from "@/lib/types";

/** `members` is null when the roster couldn't be loaded (or isn't real yet). */
export function SettingsView({ members }: { members: WorkspaceMember[] | null }) {
  const { appEnv, demoSession, user, workspace, workspaceState, workspaceMessage, plan } = useSession();
  const canManage = workspaceState === "ready" && (workspace.role === "owner" || workspace.role === "admin");
  const [note, setNote] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Account */}
      <Section title="Account" description="Your sign-in identity. Profile editing arrives with account settings.">
        <div className="flex items-center gap-4">
          <Avatar name={user.name} size={56} />
          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            <Field label="Name"><Input value={user.name} readOnly disabled /></Field>
            <Field label="Email"><Input value={user.email} readOnly disabled /></Field>
          </div>
        </div>
        {!demoSession && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link href="/reset-password"><Icon name="KeyRound" /> Change password</Link>
            </Button>
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm"><Icon name="LogOut" /> Sign out</Button>
            </form>
          </div>
        )}
      </Section>

      {/* Workspace */}
      <Section
        title="Workspace"
        description={canManage ? "Rename this workspace or change its URL." : "Settings for the current workspace."}
      >
        {canManage ? (
          <WorkspaceSettingsForm key={workspace.id} workspace={workspace} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Workspace name"><Input value={workspace.name} readOnly disabled /></Field>
            <Field label="URL"><Input value={workspace.slug} readOnly disabled className="font-mono" /></Field>
            <Field label="Environment"><Input value={appEnv} readOnly disabled /></Field>
          </div>
        )}
        {workspaceState === "ready" && !canManage && (
          <p className="mt-3 text-[12px] text-muted">Only owners and admins can change workspace settings. Your role: <span className="capitalize">{workspace.role}</span>.</p>
        )}
        {(workspaceState === "not_provisioned" || workspaceState === "error") && (
          <p className="mt-3 text-[12px] text-warning-ink">{workspaceMessage}</p>
        )}
      </Section>

      {/* Billing */}
      <Section title="Plan & billing" description="Entitlements are enforced server-side. Upgrade to unlock more modules.">
        <div className="grid gap-3 lg:grid-cols-4">
          {PLANS.map((p) => {
            const isCurrent = p.tier === plan;
            const higher = PLAN_RANK[p.tier] > PLAN_RANK[plan];
            return (
              <div
                key={p.tier}
                className={cn(
                  "flex flex-col rounded-[12px] border p-4",
                  isCurrent ? "border-brand bg-brand-soft/30 ring-1 ring-brand/20" : "border-line bg-surface",
                )}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-semibold text-ink">{p.name}</p>
                  {isCurrent && <Badge tone="brand" size="sm">Current</Badge>}
                </div>
                <p className="mt-1 text-[18px] font-semibold text-ink">{p.priceLabel}</p>
                <p className="text-[11.5px] text-muted">{p.tagline}</p>
                <ul className="mt-3 flex-1 space-y-1.5">
                  {p.features.slice(0, 5).map((f) => (
                    <li key={f} className="flex items-start gap-1.5 text-[11.5px] text-ink-2">
                      <Icon name="Check" className="mt-0.5 size-3 shrink-0 text-success" /> {f}
                    </li>
                  ))}
                </ul>
                <Button
                  size="sm"
                  variant={isCurrent ? "secondary" : higher ? "primary" : "ghost"}
                  disabled={isCurrent}
                  className="mt-3"
                  onClick={() => setNote(`Billing isn't connected in this environment — ${higher ? "upgrade" : "change"} to ${p.name} requires a connected billing backend. Nothing was charged.`)}
                >
                  {isCurrent ? "Current plan" : higher ? "Upgrade" : "Switch"}
                </Button>
              </div>
            );
          })}
        </div>
        {note && (
          <div className="mt-3 flex items-start gap-2 rounded-[9px] border border-line bg-surface-2/60 px-3 py-2">
            <Icon name="Info" className="mt-0.5 size-3.5 shrink-0 text-muted" />
            <p className="text-[12px] text-muted">{note}</p>
          </div>
        )}
      </Section>

      {/* Entitlements */}
      <Section title="Entitlements" description={`What the ${PLANS.find((p) => p.tier === plan)?.name} plan includes.`}>
        <div className="flex flex-wrap gap-1.5">
          {(PLANS.find((p) => p.tier === plan)?.entitlements ?? []).map((e) => (
            <Badge key={e} tone="neutral" size="md" className="font-mono">{e}</Badge>
          ))}
        </div>
      </Section>

      {/* Team */}
      <Section
        title="Team"
        description={members ? `${members.length} member${members.length === 1 ? "" : "s"} in this workspace. Invitations are coming next.` : undefined}
      >
        {members ? (
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.userId} className="flex items-center gap-3 rounded-[9px] border border-line bg-surface p-3">
                <Avatar name={m.fullName} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-medium text-ink">
                    {m.fullName}
                    {m.userId === user.id && <span className="ml-1.5 text-[11px] font-normal text-faint">(you)</span>}
                  </p>
                </div>
                <Badge tone={m.role === "owner" ? "brand" : "muted"} size="sm" className="capitalize">{m.role}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12.5px] text-muted">
            {workspaceState === "demo"
              ? "Team members aren't available in the demo session."
              : "The team roster isn't available until workspaces are set up."}
          </p>
        )}
      </Section>

      {/* Danger */}
      <Card className="border-critical-soft p-5">
        <h3 className="text-[13px] font-semibold text-critical-ink">Danger zone</h3>
        <Separator className="my-3 bg-critical-soft" />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[12.5px] font-medium text-ink">Delete workspace</p>
            <p className="text-[11.5px] text-muted">Permanently removes this workspace and all its scans.</p>
          </div>
          <Button variant="danger-soft" size="sm" disabled title="Workspace deletion isn't available yet">
            <Icon name="AlertTriangle" /> Delete workspace · coming soon
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <h2 className="text-[14px] font-semibold text-ink">{title}</h2>
      {description && <p className="mt-0.5 text-[12.5px] text-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11.5px] font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
