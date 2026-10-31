import type { AiProvider, AiTool, PlanTier, Pillar, Severity } from "./types";

export const APP_NAME = "VibeShield";
export const APP_TAGLINE = "From vibe code to production ready.";

// ---- Navigation --------------------------------------------------------------

export interface NavItem {
  href: string;
  label: string;
  icon: string; // lucide icon name
  group: "monitor" | "remediate" | "configure";
  minPlan?: PlanTier;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/overview", label: "Overview", icon: "LayoutDashboard", group: "monitor" },
  { href: "/onboarding", label: "Connect & Scan", icon: "Radar", group: "monitor" },
  { href: "/scans", label: "Repository Scans", icon: "ScanLine", group: "monitor" },
  { href: "/fix", label: "Fix Workspace", icon: "Wrench", group: "remediate", minPlan: "builder" },
  { href: "/finops", label: "FinOps Monitor", icon: "Gauge", group: "remediate", minPlan: "builder" },
  { href: "/database", label: "Database & Stripe", icon: "Database", group: "remediate", minPlan: "builder" },
  { href: "/smoke-tests", label: "Smoke Tests", icon: "FlaskConical", group: "remediate", minPlan: "pro" },
  { href: "/context-sync", label: "AI Context Sync", icon: "RefreshCw", group: "remediate", minPlan: "builder" },
  { href: "/integrations", label: "Integrations", icon: "Plug", group: "configure" },
  { href: "/settings", label: "Settings", icon: "Settings", group: "configure" },
];

export const NAV_GROUPS: { id: NavItem["group"]; label: string }[] = [
  { id: "monitor", label: "Monitor" },
  { id: "remediate", label: "Remediate" },
  { id: "configure", label: "Configure" },
];

// ---- Pillars -----------------------------------------------------------------

export const PILLARS: Record<
  Pillar,
  { label: string; short: string; icon: string; description: string }
> = {
  security: {
    label: "Security & Data Privacy",
    short: "Security",
    icon: "ShieldCheck",
    description: "Supabase RLS, exposed keys, server-side authorization boundaries.",
  },
  finops: {
    label: "Wallet & Loop Protection",
    short: "FinOps",
    icon: "Wallet",
    description: "Infinite loops, unthrottled paid API routes, spend protection.",
  },
  revenue: {
    label: "Revenue & Checkout Integrity",
    short: "Revenue",
    icon: "CreditCard",
    description: "Stripe webhook verification, idempotency, subscription lifecycle.",
  },
  "code-health": {
    label: "Code Health & AI Context",
    short: "Code Health",
    icon: "Code2",
    description: "Dead deps, monolith files, rules-file drift, duplicate components.",
  },
};

export const PILLAR_ORDER: Pillar[] = ["security", "finops", "revenue", "code-health"];

// ---- Severity ----------------------------------------------------------------

export const SEVERITY: Record<
  Severity,
  { label: string; tone: "critical" | "warning" | "info" | "muted" | "success"; weight: number }
> = {
  critical: { label: "Critical", tone: "critical", weight: 4 },
  high: { label: "High", tone: "critical", weight: 3 },
  medium: { label: "Medium", tone: "warning", weight: 2 },
  low: { label: "Low", tone: "info", weight: 1 },
  info: { label: "Info", tone: "muted", weight: 0 },
};

// ---- AI tools (fix-prompt targets) ------------------------------------------

export const AI_TOOLS: Record<AiTool, { label: string; icon: string }> = {
  cursor: { label: "Cursor", icon: "MousePointer2" },
  lovable: { label: "Lovable", icon: "Heart" },
  bolt: { label: "Bolt", icon: "Zap" },
  v0: { label: "v0", icon: "Triangle" },
  windsurf: { label: "Windsurf", icon: "Wind" },
  replit: { label: "Replit", icon: "Terminal" },
  "claude-code": { label: "Claude Code", icon: "Sparkles" },
};

export const AI_TOOL_ORDER: AiTool[] = ["cursor", "lovable", "bolt", "v0", "windsurf", "replit"];

// ---- Spend providers ---------------------------------------------------------

export const PROVIDERS: Record<AiProvider, { label: string; icon: string }> = {
  openai: { label: "OpenAI", icon: "Bot" },
  anthropic: { label: "Anthropic", icon: "Sparkles" },
  elevenlabs: { label: "ElevenLabs", icon: "AudioLines" },
  replicate: { label: "Replicate", icon: "Boxes" },
  resend: { label: "Resend", icon: "Mail" },
};

// ---- Pricing / entitlements --------------------------------------------------

export interface Plan {
  tier: PlanTier;
  name: string;
  priceLabel: string;
  tagline: string;
  features: string[];
  entitlements: string[];
}

export const PLANS: Plan[] = [
  {
    tier: "free",
    name: "Vibe Check",
    priceLabel: "$0",
    tagline: "One-click readiness check.",
    features: [
      "URL / repository scan",
      "Launch Readiness Score",
      "Top 2 critical fixes revealed",
      "Embeddable verified badge",
    ],
    entitlements: ["scan.one", "score.view", "findings.top2", "badge.embed"],
  },
  {
    tier: "builder",
    name: "Builder",
    priceLabel: "$29/mo",
    tagline: "Understand & self-remediate.",
    features: [
      "Unlimited scans",
      "Copy-paste AI fix prompts",
      "Supabase RLS generator",
      "Infinite loop detector",
      "AI rules-file sync",
      "MCP Server",
    ],
    entitlements: [
      "scan.unlimited",
      "findings.all",
      "prompts.ai",
      "rls.generate",
      "finops.detect",
      "context.sync",
      "mcp.server",
    ],
  },
  {
    tier: "pro",
    name: "Pro / Launch",
    priceLabel: "$79/mo",
    tagline: "Automated remediation & gatekeeping.",
    features: [
      "Automatic remediation PRs",
      "Continuous pre-deploy gatekeeper",
      "Playwright smoke testing",
      "Stripe webhook tester",
      "Rate-limit middleware",
    ],
    entitlements: [
      "pr.auto",
      "gate.deploy",
      "smoke.run",
      "stripe.test",
      "ratelimit.deploy",
    ],
  },
  {
    tier: "team",
    name: "Team / Enterprise",
    priceLabel: "$299–2,000/mo",
    tagline: "Governance for teams & agencies.",
    features: [
      "Team & enterprise governance",
      "Agency / mid-market controls",
      "SSO & audit exports",
      "Priority remediation",
    ],
    entitlements: ["*"],
  },
];

export const PLAN_RANK: Record<PlanTier, number> = {
  free: 0,
  builder: 1,
  pro: 2,
  team: 3,
};

/** Server-authoritative in production; this mirror is for UI affordances only. */
export function planAllows(current: PlanTier, required?: PlanTier): boolean {
  if (!required) return true;
  return PLAN_RANK[current] >= PLAN_RANK[required];
}
