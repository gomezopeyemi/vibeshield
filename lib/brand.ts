import type { CapabilityStatus } from "./types";

/* Public-site copy, navigation and section themes in one place. Colours live
 * as --mk-* tokens in app/globals.css; themes below refer to them by name.
 *
 * Every claim here must be true today (see lib/marketing.ts and
 * IMPLEMENTATION_STATUS.md): no invented customer counts, certifications or
 * pages that don't exist. Unbuilt things are labelled, not linked. */

export const BRAND = {
  name: "VibeShield",
  headline: "Ship what you vibe-coded, safely.",
  subhead:
    "VibeShield scans apps built with AI coding tools for leaked keys, open databases and runaway costs, then explains each problem and hands you the fix.",
  /** The spec's "Get a demo": there is no demo programme, so the CTA opens sign-up. */
  cta: { label: "Get started", href: "/signup" },
  login: { label: "Log in", href: "/login" },
  ctaNote: "Free during early access.",
  /** "static": pre-baked tile (public/marketing/hero-dots.svg). "filter": live SVG warp, heavier to paint. */
  heroTexture: "static" as "static" | "filter",
  /** Rendered only when set. */
  social: { linkedin: null as string | null, x: null as string | null },
} as const;

/** Section colour themes read by the background observer (data-bg / data-fg). */
export const THEMES = {
  hero: { bg: "var(--mk-hero)", fg: "var(--mk-ink)" },
  lavender: { bg: "var(--mk-lavender)", fg: "var(--mk-ink)" },
  slate: { bg: "var(--mk-slate)", fg: "var(--mk-offwhite)" },
  offwhite: { bg: "var(--mk-offwhite)", fg: "var(--mk-ink)" },
  footer: { bg: "var(--mk-footer)", fg: "var(--mk-offwhite)" },
} as const;

export type ThemeName = keyof typeof THEMES;
export const themeAttrs = (t: ThemeName) => ({ "data-bg": THEMES[t].bg, "data-fg": THEMES[t].fg });

// ---- Navigation ------------------------------------------------------------------

export interface NavLink {
  label: string;
  /** null = not built yet; shown as "Soon", never as a link. */
  href: string | null;
  description?: string;
}

export const NAV_PRODUCT: NavLink[] = [
  { label: "What we check", href: "/#checks", description: "Secrets, database policies, webhooks, costly loops." },
  { label: "All features", href: "/features", description: "Every capability, labelled with where it stands." },
  { label: "Fix prompts", href: "/features", description: "Ready-to-paste fixes for your AI tool." },
];

export const NAV_SOLUTIONS: NavLink[] = [
  { label: "Solo founders", href: "/#built-for", description: "Launch without a security team." },
  { label: "Agencies", href: "/#built-for", description: "Check every client app before hand-off." },
  { label: "Small teams", href: "/#built-for", description: "One readiness score everyone can see." },
];

export const NAV_RESOURCES: { category: string; columns: [NavLink[], NavLink[]] }[] = [
  {
    category: "Product",
    columns: [
      [
        { label: "Features", href: "/features" },
        { label: "Plans", href: "/pricing" },
      ],
      [{ label: "What works today", href: "/features" }],
    ],
  },
  {
    category: "Company",
    columns: [
      [
        { label: "Terms (draft)", href: "/terms" },
        { label: "Privacy (draft)", href: "/privacy" },
      ],
      [{ label: "Contact", href: null }],
    ],
  },
  {
    category: "Security guides",
    columns: [
      [
        { label: "Pre-launch checklist", href: null },
        { label: "Supabase RLS basics", href: null },
      ],
      [{ label: "Stripe webhook safety", href: null }],
    ],
  },
  {
    category: "All resources",
    columns: [[{ label: "Browse resources", href: "/#resources" }], []],
  },
];

// ---- Sections --------------------------------------------------------------------

/** Tools VibeShield is built for: a statement of support, not of endorsement.
 * `logo` is a file in public/marketing/logos (Simple Icons, CC0); none = name only. */
export const WORDMARKS: { name: string; style: "sans" | "serif" | "mono" | "round"; logo?: string }[] = [
  { name: "Cursor", style: "sans", logo: "cursor" },
  { name: "Lovable", style: "serif" },
  { name: "Bolt", style: "round" },
  { name: "v0", style: "mono", logo: "v0" },
  { name: "Windsurf", style: "sans", logo: "windsurf" },
  { name: "Replit", style: "round", logo: "replit" },
  { name: "Claude Code", style: "serif", logo: "claude" },
  { name: "Next.js", style: "sans", logo: "nextdotjs" },
  { name: "Supabase", style: "round", logo: "supabase" },
  { name: "Stripe", style: "sans", logo: "stripe" },
  { name: "Vercel", style: "mono", logo: "vercel" },
  { name: "GitHub", style: "serif", logo: "github" },
];
export const WORDMARK_LABEL = "Built for apps made with the tools you already use";

export const ALL_HERE = {
  heading: "Everything between prompt and production",
  subhead: "One scan finds what your AI tool left behind, and tells you what it means.",
  cards: [
    { title: "Security", body: "Leaked keys, open database policies and paid routes anyone can call." },
    { title: "Cost", body: "Render loops and unmetered AI calls that turn into surprise bills." },
    { title: "Revenue", body: "Stripe webhooks that can be forged or that silently drop payments." },
  ],
  chat: {
    question: "Is our database safe to launch?",
    answer:
      "Almost. Row Level Security is on for 11 of 12 tables, but profiles has a USING (true) policy, so anyone can read every row.",
  },
  feature: {
    heading: "Answers, not alerts",
    body: "Every finding explains what it means for your business, points to the exact line, and comes with a prompt you can paste straight into Cursor, Lovable, Bolt, v0, Windsurf, Replit or Claude Code.",
    cta: { label: "Learn more", href: "/features" },
  },
};

export type CheckIcon = "key" | "database" | "card" | "lock" | "loop" | "file" | "history";

export const CHECKS: { title: string; subtitle: string; icon: CheckIcon; status: CapabilityStatus }[] = [
  { title: "Exposed secrets", subtitle: "Service-role and API keys in client code", icon: "key", status: "available" },
  { title: "Supabase RLS", subtitle: "Tables without row security or with open policies", icon: "database", status: "available" },
  { title: "Stripe webhooks", subtitle: "Handlers that skip signature checks", icon: "card", status: "available" },
  { title: "Paid API routes", subtitle: "AI endpoints with no auth or rate limit", icon: "lock", status: "available" },
  { title: "Runaway loops", subtitle: "Effects that re-run and bill you forever", icon: "loop", status: "available" },
  { title: "AI rules files", subtitle: "Security guidance your AI tool can follow", icon: "file", status: "available" },
  { title: "Git history", subtitle: "Secrets committed once and later deleted", icon: "history", status: "building" },
];

export const BUILT_FOR = {
  heading: "Built for people shipping fast",
  subhead: "You don't need a security team to launch responsibly. You need to know what's wrong and how to fix it.",
  cards: [
    { title: "Solo founders", body: "Know your app is safe to put in front of paying users.", art: "/marketing/illustrations/solo-founders.svg" },
    { title: "Agencies", body: "Check every client build before you hand it over.", art: "/marketing/illustrations/agencies.svg" },
    { title: "Small teams", body: "One readiness score that everyone on the team can see.", art: "/marketing/illustrations/small-teams.svg" },
  ],
};

export const RESOURCES: { kind: string; title: string; href: string | null; art: string }[] = [
  { kind: "Guide", title: "What VibeShield checks today", href: "/features", art: "/marketing/illustrations/guide.svg" },
  { kind: "Plans", title: "Pricing during early access", href: "/pricing", art: "/marketing/illustrations/plans.svg" },
  { kind: "Checklist", title: "Pre-launch security checklist", href: null, art: "/marketing/illustrations/checklist.svg" },
  { kind: "Checklist", title: "Supabase RLS in ten minutes", href: null, art: "/marketing/illustrations/rls.svg" },
];

export const FINAL_CTA = { heading: "Vibe-coded. Production-ready.", art: "/marketing/illustrations/launch.svg" };

export const HOW_IT_WORKS = {
  heading: "From prompt to production",
  subhead: "Six steps, each labelled with where it stands today.",
};

export const FOOTER_COLUMNS: { title: string; links: NavLink[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/features" },
      { label: "What we check", href: "/#checks" },
      { label: "Plans", href: "/pricing" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Log in", href: "/login" },
      { label: "Create account", href: "/signup" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Resources", href: "/#resources" },
      { label: "Security guides", href: null },
    ],
  },
];

export const LEGAL_LINKS: { label: string; href: string }[] = [
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
];
