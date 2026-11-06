import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsView } from "@/components/settings/settings-view";
import { getWorkspaceContext, listMembers } from "@/lib/workspaces/data";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const ctx = await getWorkspaceContext();
  const members = ctx.state === "ready" ? await listMembers(ctx.current.id) : null;
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your account, workspace, team and subscription." />
      <SettingsView members={members} />
    </div>
  );
}
