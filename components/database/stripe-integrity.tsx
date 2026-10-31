"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { StripeEndpoint } from "@/lib/types";
import type { StripeFlowStep } from "@/lib/demo/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
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

const STATE_ICON: Record<StripeFlowStep["state"], { icon: IconName; cls: string; ring: string }> = {
  ok: { icon: "CheckCircle2", cls: "text-success", ring: "border-success-soft bg-success-soft/50" },
  warn: { icon: "AlertTriangle", cls: "text-warning-ink", ring: "border-warning-soft bg-warning-soft/50" },
  fail: { icon: "XCircle", cls: "text-critical", ring: "border-critical-soft bg-critical-soft/50" },
  unknown: { icon: "Circle", cls: "text-faint", ring: "border-line bg-surface-2" },
};

export function StripeIntegrity({
  endpoint,
  flow,
}: {
  endpoint: StripeEndpoint;
  flow: StripeFlowStep[];
}) {
  const [event, setEvent] = useState("checkout.session.completed");
  const { run, status, response } = useAction("/api/stripe/test");

  const checks: { label: string; ok: boolean }[] = [
    { label: "Signature verification (constructEvent)", ok: endpoint.verifiesSignature },
    { label: "Idempotency / event de-duplication", ok: endpoint.idempotent },
    { label: "Database synchronization", ok: endpoint.syncsDatabase },
    { label: "Handles cancellation events", ok: endpoint.handlesCancellation },
    { label: "Handles downgrade events", ok: endpoint.handlesDowngrade },
  ];

  return (
    <div className="space-y-4">
      {/* Flow */}
      <Card className="p-5">
        <h3 className="text-[13px] font-semibold text-ink">Payment flow integrity</h3>
        <p className="text-[12px] text-muted">Checkout → Webhook → Signature → Idempotency → DB → Lifecycle</p>
        <div className="mt-4 flex items-stretch gap-1 overflow-x-auto pb-1">
          {flow.map((s, i) => {
            const m = STATE_ICON[s.state];
            return (
              <div key={s.id} className="flex items-center gap-1">
                <div className={cn("flex min-w-[112px] flex-col gap-1 rounded-[10px] border p-2.5", m.ring)}>
                  <Icon name={m.icon} className={cn("size-4", m.cls)} />
                  <span className="text-[11.5px] font-medium leading-tight text-ink">{s.label}</span>
                  <span className="text-[10px] leading-tight text-muted">{s.detail}</span>
                </div>
                {i < flow.length - 1 && <Icon name="ArrowRight" className="size-4 shrink-0 text-faint" />}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Checks */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-[13px] font-semibold text-ink">Webhook endpoint</h3>
          <span className="font-mono text-[11px] text-muted">{endpoint.path.replace("src/app", "")}</span>
        </div>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {checks.map((c) => (
            <li key={c.label} className="flex items-center gap-2 text-[12.5px]">
              <Icon name={c.ok ? "CheckCircle2" : "XCircle"} className={cn("size-4", c.ok ? "text-success" : "text-critical")} />
              <span className={c.ok ? "text-ink-2" : "text-ink"}>{c.label}</span>
            </li>
          ))}
        </ul>
        {endpoint.findingIds.length > 0 && (
          <Link
            href="/fix?pillar=revenue"
            className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-brand hover:text-brand-ink"
          >
            <Icon name="Wrench" className="size-3.5" /> Fix revenue findings
          </Link>
        )}
      </Card>

      {/* Webhook test workspace */}
      <Card className="p-5">
        <div className="flex items-center gap-2">
          <Icon name="Webhook" className="size-4 text-brand" />
          <h3 className="text-[13px] font-semibold text-ink">Webhook test workspace</h3>
          <Badge tone="neutral" size="sm" className="ml-auto">Sandbox only</Badge>
        </div>
        <p className="mt-1 text-[12px] text-muted">
          Dispatch a signed test event to your endpoint in a sandbox. Never writes to real customer payment records.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <div className="flex-1">
            <Select value={event} onValueChange={setEvent}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="checkout.session.completed">checkout.session.completed</SelectItem>
                <SelectItem value="customer.subscription.updated">customer.subscription.updated</SelectItem>
                <SelectItem value="customer.subscription.deleted">customer.subscription.deleted</SelectItem>
                <SelectItem value="invoice.payment_failed">invoice.payment_failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="primary" disabled={status === "pending"} onClick={() => run({ event })}>
            {status === "pending" ? <><Icon name="Loader2" className="animate-spin" /> Running…</> : <><Icon name="Play" /> Run test</>}
          </Button>
        </div>

        {/* Honest result area */}
        {status === "ok" && response?.ok ? (
          <div className="mt-3 rounded-[9px] border border-line bg-surface-2/50 p-3 font-mono text-[11.5px] text-ink-2">
            Test dispatched.
          </div>
        ) : (
          <ActionNotice status={status} response={response} className="mt-3" />
        )}
      </Card>
    </div>
  );
}
