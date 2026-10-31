import type { Repository, User, Workspace, Integration } from "@/lib/types";

/* ⚠️ DEMO DATA — isolated fixtures used only to make the UI viewable before
 * real integrations are connected. Never treated as live and never written to
 * production. Every consumer flags this with an origin of "demo". */

export const DEMO_USER: User = {
  id: "usr_demo",
  name: "Alex Carter",
  email: "alex@alex-tech.app",
  plan: "pro",
};

export const DEMO_WORKSPACES: Workspace[] = [
  {
    id: "ws_alextech",
    name: "alex-tech",
    slug: "alex-tech",
    plan: "pro",
    memberCount: 3,
  },
  {
    id: "ws_side",
    name: "weekend-labs",
    slug: "weekend-labs",
    plan: "builder",
    memberCount: 1,
  },
];

export const DEMO_REPOSITORIES: Repository[] = [
  {
    id: "repo_saas",
    owner: "alex-tech",
    name: "saas-starter",
    fullName: "alex-tech/saas-starter",
    defaultBranch: "main",
    private: true,
    liveUrl: "https://saas-starter.vercel.app",
    stagingUrl: "https://staging.saas-starter.vercel.app",
    connection: "connected",
    lastScanAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
  },
  {
    id: "repo_market",
    owner: "alex-tech",
    name: "marketplace",
    fullName: "alex-tech/marketplace",
    defaultBranch: "main",
    private: true,
    liveUrl: "https://marketplace.alex-tech.app",
    connection: "connected",
    lastScanAt: new Date(Date.now() - 3 * 86400_000).toISOString(),
  },
  {
    id: "repo_ai",
    owner: "alex-tech",
    name: "ai-notes",
    fullName: "alex-tech/ai-notes",
    defaultBranch: "develop",
    private: false,
    connection: "disconnected",
  },
];

export const DEMO_INTEGRATIONS: Integration[] = [
  {
    id: "int_github",
    provider: "github",
    label: "GitHub",
    status: "connected",
    scope: ["repo", "read:org"],
    connectedAt: new Date(Date.now() - 20 * 86400_000).toISOString(),
  },
  {
    id: "int_supabase",
    provider: "supabase",
    label: "Supabase",
    status: "connected",
    scope: ["projects.read", "database.read"],
    connectedAt: new Date(Date.now() - 18 * 86400_000).toISOString(),
  },
  {
    id: "int_vercel",
    provider: "vercel",
    label: "Vercel",
    status: "connected",
    scope: ["deployments.read"],
    connectedAt: new Date(Date.now() - 12 * 86400_000).toISOString(),
  },
  {
    id: "int_stripe",
    provider: "stripe",
    label: "Stripe",
    status: "disconnected",
    remediation: "Connect Stripe (restricted key) to inspect webhook integrity.",
  },
];
