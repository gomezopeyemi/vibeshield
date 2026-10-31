"use client";

import { useState } from "react";
import type { RateLimitConfig } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { ActionNotice } from "@/components/ui/action-notice";
import { useAction } from "@/lib/hooks/use-action";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

export function KillSwitch({ config }: { config: RateLimitConfig["dailySpendKillSwitch"] }) {
  const [threshold, setThreshold] = useState(config.thresholdUsd);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { run, status, response } = useAction("/api/finops/kill-switch");

  // Armed only if the backend confirmed it. A UI toggle alone never arms it.
  const armed = config.enabled && config.confirmedByBackend;

  const arm = async () => {
    await run({ enabled: true, thresholdUsd: threshold });
    setConfirmOpen(false);
  };

  return (
    <div className="rounded-[12px] border border-line bg-surface p-5 shadow-[0_1px_3px_rgba(16,24,40,0.04)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="Siren" className={armed ? "size-5 text-success" : "size-5 text-faint"} />
          <h3 className="text-[14px] font-semibold text-ink">Daily Spend Kill Switch</h3>
        </div>
        <Badge tone={armed ? "success" : "muted"} size="sm">
          {armed ? "Armed" : "Not armed"}
        </Badge>
      </div>
      <p className="mt-1 text-[12px] text-muted">
        Automatically halts protected routes for the day if spend crosses your threshold.
      </p>

      <div className="mt-4 flex items-end gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-[11.5px] font-medium text-muted">Daily threshold (USD)</label>
          <Input
            type="number"
            min={1}
            icon="CircleDollarSign"
            value={threshold}
            onChange={(e) => setThreshold(Math.max(1, Number(e.target.value) || 1))}
          />
        </div>
        <Button variant={armed ? "danger-soft" : "primary"} onClick={() => setConfirmOpen(true)}>
          {armed ? <><Icon name="Ban" /> Disarm</> : <><Icon name="Siren" /> Arm kill switch</>}
        </Button>
      </div>

      <div className="mt-3 rounded-[9px] border border-line bg-surface-2/50 px-3 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">Recovery</p>
        <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">
          If triggered, the switch releases at the next UTC day boundary, or you can manually reset it here once
          you&apos;ve addressed the cause.
        </p>
      </div>

      <ActionNotice status={status} response={response} className="mt-3" />

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Arm the Daily Spend Kill Switch?</DialogTitle>
            <DialogDescription>
              When armed, VibeShield will block protected routes for the rest of the UTC day once spend exceeds
              <span className="font-medium text-ink"> ${threshold}</span>. This can interrupt live traffic. The switch
              is only active once the backend confirms activation.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button variant="primary" onClick={arm} disabled={status === "pending"}>
              {status === "pending" ? <><Icon name="Loader2" className="animate-spin" /> Requesting…</> : "Confirm & arm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
