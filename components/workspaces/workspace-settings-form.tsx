"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { renameWorkspace } from "@/lib/workspaces/actions";
import { WORKSPACE_IDLE } from "@/lib/workspaces/schemas";
import type { Workspace } from "@/lib/types";

export function WorkspaceSettingsForm({ workspace }: { workspace: Workspace }) {
  const [state, action, pending] = useActionState(renameWorkspace, WORKSPACE_IDLE);
  const nameErr = state.fieldErrors?.name?.[0];
  const slugErr = state.fieldErrors?.slug?.[0];

  return (
    <form action={action} className="space-y-3" noValidate>
      <input type="hidden" name="id" value={workspace.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[11.5px] font-medium text-muted">Workspace name</span>
          <Input name="name" defaultValue={state.values?.name ?? workspace.name} maxLength={80} invalid={Boolean(nameErr)} />
          {nameErr && <span className="mt-1 block text-[12px] text-critical-ink">{nameErr}</span>}
        </label>
        <label className="block">
          <span className="mb-1 block text-[11.5px] font-medium text-muted">URL</span>
          <Input name="slug" defaultValue={state.values?.slug ?? workspace.slug} maxLength={48} className="font-mono" invalid={Boolean(slugErr)} />
          {slugErr && <span className="mt-1 block text-[12px] text-critical-ink">{slugErr}</span>}
        </label>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" variant="secondary" disabled={pending}>
          {pending ? <><Icon name="Loader2" className="animate-spin" /> Saving…</> : "Save changes"}
        </Button>
        {state.message && (
          <span className={state.status === "success" ? "text-[12px] text-success-ink" : "text-[12px] text-critical-ink"} role="status">
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}
