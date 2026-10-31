import type { Metadata } from "next";
import { getDatabase } from "@/lib/data";
import { PageHeader } from "@/components/ui/page-header";
import { DataBanner } from "@/components/ui/data-banner";
import { OriginPill } from "@/components/ui/status-pill";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Icon } from "@/components/ui/icon";
import { Stat } from "@/components/ui/stat";
import { DatabaseMap } from "@/components/database/db-map";
import { StripeIntegrity } from "@/components/database/stripe-integrity";

export const metadata: Metadata = { title: "Database & Stripe" };

export default async function DatabasePage() {
  const env = await getDatabase();
  const { tables, stripeEndpoint, stripeFlow } = env.data;
  const rlsOff = tables.filter((t) => !t.rlsEnabled).length;
  const permissive = tables.filter((t) => t.policies.some((p) => p.permissive)).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Database & Stripe Integrity"
        description="Inspect your Supabase schema for access-control gaps and verify your Stripe payment flow end to end."
        badge={<OriginPill origin={env.origin} />}
      />

      <DataBanner origin={env.origin} note={env.note} />

      <Tabs defaultValue="database">
        <TabsList>
          <TabsTrigger value="database"><Icon name="Database" className="size-4" /> Database Security</TabsTrigger>
          <TabsTrigger value="stripe"><Icon name="CreditCard" className="size-4" /> Payment Integrity</TabsTrigger>
        </TabsList>

        <TabsContent value="database" className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Tables inspected" value={tables.length} icon="Table2" />
            <Stat label="RLS disabled" value={rlsOff} icon="Unlock" sub={rlsOff > 0 ? "needs attention" : "all protected"} />
            <Stat label="Permissive policies" value={permissive} icon="ShieldAlert" />
            <Stat label="Total policies" value={tables.reduce((n, t) => n + t.policies.length, 0)} icon="Lock" />
          </div>
          <DatabaseMap tables={tables} />
        </TabsContent>

        <TabsContent value="stripe" className="mt-5">
          <StripeIntegrity endpoint={stripeEndpoint} flow={stripeFlow} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
