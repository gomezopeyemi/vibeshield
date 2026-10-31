"use client";

import { useState } from "react";
import type { RateLimitConfig } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { ActionNotice } from "@/components/ui/action-notice";
import { useAction } from "@/lib/hooks/use-action";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export function RateLimitForm({ config }: { config: RateLimitConfig }) {
  const [enabled, setEnabled] = useState(config.enabled);
  const [rpm, setRpm] = useState(config.requestsPerMinute);
  const [strategy, setStrategy] = useState(config.strategy);
  const [scope, setScope] = useState(config.scope);
  const { run, status, response } = useAction("/api/finops/rate-limit");

  return (
    <div className="rounded-[12px] border border-line bg-surface p-5 shadow-[0_1px_3px_rgba(16,24,40,0.04)]">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-semibold text-ink">Rate-limit middleware</h3>
          <p className="text-[12px] text-muted">Upstash Redis token bucket. Example: 10 req/min per IP + user.</p>
        </div>
        <label className="flex items-center gap-2">
          <span className="text-[12px] text-muted">{enabled ? "Enabled" : "Disabled"}</span>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </label>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-[11.5px] font-medium text-muted">Requests / minute</label>
          <Input
            type="number"
            min={1}
            value={rpm}
            onChange={(e) => setRpm(Math.max(1, Number(e.target.value) || 1))}
          />
        </div>
        <div>
          <label className="mb-1 block text-[11.5px] font-medium text-muted">Strategy</label>
          <Select value={strategy} onValueChange={(v) => setStrategy(v as RateLimitConfig["strategy"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="token-bucket">Token bucket</SelectItem>
              <SelectItem value="sliding-window">Sliding window</SelectItem>
              <SelectItem value="fixed-window">Fixed window</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-[11.5px] font-medium text-muted">Scope</label>
          <Select value={scope} onValueChange={(v) => setScope(v as RateLimitConfig["scope"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ip">Per IP</SelectItem>
              <SelectItem value="user">Per user</SelectItem>
              <SelectItem value="ip+user">Per IP + user</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button
          variant="primary"
          size="sm"
          disabled={status === "pending"}
          onClick={() => run({ enabled, requestsPerMinute: rpm, strategy, scope })}
        >
          {status === "pending" ? <><Icon name="Loader2" className="animate-spin" /> Saving…</> : <><Icon name="Check" /> Save configuration</>}
        </Button>
        <Badge tone="neutral" size="sm">Backend: {config.backend}</Badge>
      </div>
      <ActionNotice status={status} response={response} className="mt-3" />
    </div>
  );
}
