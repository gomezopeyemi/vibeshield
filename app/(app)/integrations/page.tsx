import type { Metadata } from "next";
import { getIntegrations } from "@/lib/data";
import { PROVIDERS } from "@/lib/constants";
import type { Integration, AiProvider } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { DataBanner } from "@/components/ui/data-banner";
import { OriginPill } from "@/components/ui/status-pill";
import { IntegrationCard } from "@/components/integrations/integration-card";

export const metadata: Metadata = { title: "Integrations" };

const PROVIDER_KEYS = Object.keys(PROVIDERS) as AiProvider[];

export default async function IntegrationsPage() {
  const env = await getIntegrations();
  const integrations = env.data;

  // Provider integrations (spend sources) — shown as not-connected until wired.
  const providerIntegrations: Integration[] = PROVIDER_KEYS.map((p) => ({
    id: `int_${p}`,
    provider: p,
    label: PROVIDERS[p].label,
    status: "disconnected",
    remediation: "Connect to track request volume and spend for denial-of-wallet protection.",
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations"
        description="Connect the services VibeShield inspects and protects. Each module unlocks as its integration connects."
        badge={<OriginPill origin={env.origin} />}
      />

      {env.origin !== "live" && <DataBanner origin={env.origin} />}

      <section className="space-y-3">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-faint">Core</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {integrations.map((i) => (
            <IntegrationCard key={i.id} integration={i} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-faint">AI & spend providers</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {providerIntegrations.map((i) => (
            <IntegrationCard key={i.id} integration={i} />
          ))}
        </div>
      </section>
    </div>
  );
}
