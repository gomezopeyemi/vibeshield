"use client";

import { useState } from "react";
import { cn, timeAgo } from "@/lib/utils";
import type { Integration } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ConnectionPill } from "@/components/ui/status-pill";
import { BrandGlyph, type BrandName } from "@/components/ui/brand-glyph";

const BRANDS: Record<string, BrandName> = {
  github: "github",
  supabase: "supabase",
  vercel: "vercel",
  stripe: "stripe",
  openai: "openai",
  anthropic: "anthropic",
};

export function IntegrationCard({ integration }: { integration: Integration }) {
  const [showNote, setShowNote] = useState(false);
  const connected = integration.status === "connected";
  const brand = BRANDS[integration.provider];

  return (
    <Card className="flex flex-col p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-[10px] border border-line bg-surface-2">
            {brand ? <BrandGlyph name={brand} size={18} className="text-ink-2" /> : <Icon name="Plug" className="size-4 text-ink-2" />}
          </span>
          <div>
            <p className="text-[13.5px] font-semibold text-ink">{integration.label}</p>
            {integration.scope && (
              <p className="text-[11px] text-faint">{integration.scope.join(" · ")}</p>
            )}
          </div>
        </div>
        <ConnectionPill status={integration.status} solid />
      </div>

      <div className="mt-3 flex-1">
        {connected ? (
          <p className="text-[11.5px] text-muted">
            Connected {integration.connectedAt ? timeAgo(integration.connectedAt) : ""}.
          </p>
        ) : (
          <p className="text-[11.5px] text-muted">{integration.remediation ?? "Not connected."}</p>
        )}
      </div>

      <div className="mt-3">
        {connected ? (
          <Button size="sm" variant="secondary" className="w-full">
            <Icon name="Settings" /> Manage
          </Button>
        ) : (
          <Button size="sm" variant="primary" className="w-full" onClick={() => setShowNote((v) => !v)}>
            <Icon name="Plug" /> Connect
          </Button>
        )}
        {showNote && !connected && (
          <div className="mt-2 flex items-start gap-2 rounded-[8px] border border-line bg-surface-2/60 px-2.5 py-2">
            <Icon name="Info" className="mt-0.5 size-3.5 shrink-0 text-muted" />
            <p className={cn("text-[11px] leading-relaxed text-muted")}>
              OAuth for {integration.label} isn&apos;t configured in this environment. Set the provider credentials to
              enable the real connection flow — nothing is faked here.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
