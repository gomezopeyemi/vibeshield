import type { CapabilityStatus, ProductModule } from "./types";

/* Public capability claims. Keep in step with IMPLEMENTATION_STATUS.md —
 * nothing is "available" unless it works for a signed-in user today. */

export const STATUS_LABEL: Record<CapabilityStatus, string> = {
  available: "Available",
  preview: "Preview",
  building: "In development",
};

export const LOOP: { step: string; detail: string; status: CapabilityStatus }[] = [
  { step: "Connect", detail: "Link your GitHub repository and Supabase project.", status: "building" },
  { step: "Scan", detail: "Static rules over your code's current files.", status: "available" },
  { step: "Understand", detail: "Plain-English impact, severity and a readiness score.", status: "available" },
  { step: "Fix", detail: "Copy-paste fix prompts today; automatic fix PRs next.", status: "available" },
  { step: "Verify", detail: "A clean re-scan after fixes are merged.", status: "building" },
  { step: "Protect", detail: "Rate limits, spend kill switch and pre-deploy gates.", status: "building" },
];

export const MODULES: ProductModule[] = [
  {
    key: "security",
    name: "Security",
    summary: "Leaked keys, missing auth and open database policies.",
    icon: "ShieldCheck",
    capabilities: [
      { label: "Secret detection", detail: "Supabase service-role keys in client code, hardcoded Stripe, OpenAI and AWS keys.", status: "available" },
      { label: "Database policy checks", detail: "Tables without Row Level Security and USING (true) policies in your SQL files.", status: "available" },
      { label: "Unprotected paid routes", detail: "AI and payment API routes with no auth or rate limit.", status: "available" },
      { label: "Git history scanning", detail: "Secrets that were committed and later deleted.", status: "building" },
      { label: "Live database inspection", detail: "Reading policies directly from your Supabase project.", status: "building" },
    ],
  },
  {
    key: "finops",
    name: "Denial-of-Wallet",
    summary: "Runaway loops and unmetered AI calls that turn into surprise bills.",
    icon: "Wallet",
    capabilities: [
      { label: "Render-loop detection", detail: "useEffect hooks that set state listed in their own dependencies.", status: "available" },
      { label: "Rate-limit middleware", detail: "Per-route limits deployed to your app.", status: "building" },
      { label: "Spend kill switch", detail: "Cut off a provider when daily spend crosses your limit.", status: "building" },
    ],
  },
  {
    key: "revenue",
    name: "Revenue & Stripe",
    summary: "Webhooks that can be forged or that drop payments.",
    icon: "CreditCard",
    capabilities: [
      { label: "Webhook signature check", detail: "Stripe handlers that skip constructEvent verification.", status: "available" },
      { label: "Webhook test runs", detail: "Signed test events sent to your endpoint in a sandbox.", status: "building" },
    ],
  },
  {
    key: "testing",
    name: "Smoke tests",
    summary: "Sign-up, login and checkout tested in a real browser before you ship.",
    icon: "FlaskConical",
    capabilities: [
      { label: "Playwright smoke tests", detail: "Runs against preview deployments with screenshots.", status: "building" },
      { label: "Pre-deploy gate", detail: "Blocks promotion when a configured check fails.", status: "building" },
    ],
  },
  {
    key: "context",
    name: "AI context & compliance",
    summary: "Keep your AI tools from undoing fixes, and cover the legal basics.",
    icon: "FileText",
    capabilities: [
      { label: "AI fix prompts", detail: "Ready-to-paste prompts for Cursor, Lovable, Bolt, v0, Windsurf, Replit and Claude Code.", status: "available" },
      { label: "Monolith & rules checks", detail: "Files over 2,000 lines and AI rules files with no security guidance.", status: "available" },
      { label: "Rules-file sync & MCP server", detail: "Security rules kept in .cursorrules, .windsurfrules and CLAUDE.md.", status: "building" },
      { label: "Privacy & Terms drafts", detail: "Starting drafts for your app's legal pages; they need legal review.", status: "preview" },
    ],
  },
];
