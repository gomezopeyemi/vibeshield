import type { Metadata } from "next";
import { getTestingAndContext } from "@/lib/data";
import { PageHeader } from "@/components/ui/page-header";
import { DataBanner } from "@/components/ui/data-banner";
import { OriginPill } from "@/components/ui/status-pill";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Icon } from "@/components/ui/icon";
import { ContextFiles, McpPanel, LegalPanel } from "@/components/testing/context-panels";

export const metadata: Metadata = { title: "AI Context Sync" };

export default async function ContextSyncPage() {
  const env = await getTestingAndContext();
  const { contextFiles, contextAnalysis, mcp, legal } = env.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Context Sync & Compliance"
        description="Keep your AI tools aligned with your guardrails, validate edits through the MCP server, and generate the legal documents your integrations require."
        badge={<OriginPill origin={env.origin} />}
      />

      <DataBanner origin={env.origin} />

      <Tabs defaultValue="context">
        <TabsList>
          <TabsTrigger value="context"><Icon name="RefreshCw" className="size-4" /> AI Context</TabsTrigger>
          <TabsTrigger value="mcp"><Icon name="Server" className="size-4" /> MCP Servers</TabsTrigger>
          <TabsTrigger value="legal"><Icon name="Gavel" className="size-4" /> Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="context" className="mt-5">
          <ContextFiles files={contextFiles} analysis={contextAnalysis} />
        </TabsContent>
        <TabsContent value="mcp" className="mt-5">
          <McpPanel connections={mcp} />
        </TabsContent>
        <TabsContent value="legal" className="mt-5">
          <LegalPanel legal={legal} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
