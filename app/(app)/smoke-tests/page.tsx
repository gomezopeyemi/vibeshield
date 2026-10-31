import type { Metadata } from "next";
import { getTestingAndContext } from "@/lib/data";
import { PageHeader } from "@/components/ui/page-header";
import { DataBanner } from "@/components/ui/data-banner";
import { OriginPill } from "@/components/ui/status-pill";
import { SmokeTheater, DeploymentGate, SmokeHistory } from "@/components/testing/smoke-theater";

export const metadata: Metadata = { title: "Smoke Tests" };

export default async function SmokeTestsPage() {
  const env = await getTestingAndContext();
  const { smokeCurrent, smokeHistory } = env.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Playwright Smoke Test Theater"
        description="Autonomous browser tests for your critical flows — Sign up → Log in → Core action → Checkout — with screenshots, logs and a deploy gate."
        badge={<OriginPill origin={env.origin} />}
      />

      <DataBanner origin={env.origin} />

      <SmokeTheater run={smokeCurrent} />
      <DeploymentGate />
      <div className="grid gap-4 lg:grid-cols-2">
        <SmokeHistory runs={smokeHistory} />
      </div>
    </div>
  );
}
