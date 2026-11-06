"use client";

import { useActionState, useId, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { createWorkspace } from "@/lib/workspaces/actions";
import { WORKSPACE_IDLE, slugify } from "@/lib/workspaces/schemas";

export function NewWorkspaceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6">
        {/* Remount per open so a previous attempt's state never leaks into the next. */}
        {open && <NewWorkspaceForm onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function NewWorkspaceForm({ onDone }: { onDone: () => void }) {
  const [state, action, pending] = useActionState(createWorkspace, WORKSPACE_IDLE);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [closedFor, setClosedFor] = useState<typeof state | null>(null);
  const nameId = useId();
  const slugId = useId();

  if (state.status === "success" && closedFor !== state) {
    setClosedFor(state);
    onDone();
  }

  const nameErr = state.fieldErrors?.name?.[0];
  const slugErr = state.fieldErrors?.slug?.[0];

  return (
    <form action={action} className="space-y-4" noValidate>
      <div>
        <DialogTitle className="text-[17px] font-semibold text-ink">New workspace</DialogTitle>
        <DialogDescription className="mt-1 text-[13px] text-muted">
          A separate space for a project or team, with its own members and scans. You&apos;ll be its owner.
        </DialogDescription>
      </div>

      <div className="space-y-1.5">
        <label htmlFor={nameId} className="text-[12.5px] font-medium text-ink-2">Name</label>
        <Input
          id={nameId}
          name="name"
          value={name}
          maxLength={80}
          autoFocus
          invalid={Boolean(nameErr)}
          onChange={(e) => {
            setName(e.target.value);
            if (!slugEdited) setSlug(slugify(e.target.value));
          }}
        />
        {nameErr && <p className="text-[12px] text-critical-ink">{nameErr}</p>}
      </div>

      <div className="space-y-1.5">
        <label htmlFor={slugId} className="text-[12.5px] font-medium text-ink-2">URL</label>
        <Input
          id={slugId}
          name="slug"
          value={slug}
          maxLength={48}
          invalid={Boolean(slugErr)}
          className="font-mono"
          onChange={(e) => {
            setSlugEdited(true);
            setSlug(e.target.value.toLowerCase());
          }}
        />
        {slugErr ? (
          <p className="text-[12px] text-critical-ink">{slugErr}</p>
        ) : (
          <p className="text-[11.5px] text-faint">Lowercase letters, numbers and hyphens.</p>
        )}
      </div>

      {state.status === "error" && state.message && (
        <p className="rounded-[9px] border border-critical-soft bg-critical-soft px-3 py-2 text-[12.5px] text-critical-ink" role="alert">
          {state.message}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={pending || !name.trim()}>
          {pending ? <><Icon name="Loader2" className="animate-spin" /> Creating…</> : "Create workspace"}
        </Button>
      </div>
    </form>
  );
}
