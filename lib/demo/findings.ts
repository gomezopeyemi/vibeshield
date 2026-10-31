import type {
  Finding,
  ReadinessState,
  Scan,
  ScanEvent,
  PullRequest,
  VerificationBadge,
} from "@/lib/types";

/* ⚠️ DEMO DATA — representative findings for a typical AI-built SaaS starter.
 * Code snippets are illustrative and secret-redacted. Never live data. */

export const DEMO_FINDINGS: Finding[] = [
  {
    id: "find_servicekey",
    pillar: "security",
    severity: "critical",
    status: "open",
    title: "Exposed Supabase service role key",
    humanSummary:
      "Your database admin key is shipped to the browser. Anyone who opens your site can read it and gain full, unrestricted access to your database.",
    businessImpact:
      "An attacker could read, modify or delete every row in your database — all user data, payments and secrets — bypassing every security rule you have.",
    scanner: "gitleaks",
    evidence: "gitleaks: generic-api-key · entropy 4.8 · tracked in git history (4 commits)",
    recommendation:
      "Move the service role key to a server-only environment variable and use the publishable (anon) key in client code. Rotate the exposed key immediately.",
    scoreDelta: 22,
    detectedAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
    resource: "src/lib/supabaseClient.ts",
    context: {
      path: "src/lib/supabaseClient.ts",
      language: "tsx",
      startLine: 11,
      snippet: `import { createClient } from "@supabase/supabase-js";

// ❌ EXPOSED KEY — service role must never reach the client bundle
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE!; // ••••••••redacted

export const supabase = createClient(supabaseUrl, supabaseKey);`,
      proposed: `import { createClient } from "@supabase/supabase-js";

// ✅ Browser client uses the publishable anon key only
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);`,
    },
  },
  {
    id: "find_rls_profiles",
    pillar: "security",
    severity: "high",
    status: "open",
    title: "Row Level Security disabled on public.profiles",
    humanSummary:
      "The table that stores every user's profile has no access rules. Any logged-in user can read and edit everyone else's profile data.",
    businessImpact:
      "User emails, names and private settings are readable and editable across accounts — a direct data-privacy breach and likely GDPR violation.",
    scanner: "supabase",
    evidence: "pg_tables: rowsecurity = false · 0 policies on public.profiles",
    recommendation:
      "Enable RLS on public.profiles and add owner-scoped policies so each user can only access their own row.",
    scoreDelta: 16,
    detectedAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
    resource: "public.profiles",
    context: {
      path: "supabase/policies/profiles.sql",
      language: "sql",
      startLine: 1,
      snippet: `-- No row level security configured for public.profiles
-- Table is world-readable and world-writable to any authenticated user.`,
      proposed: `alter table public.profiles enable row level security;

create policy "Profiles are viewable by owner"
  on public.profiles for select
  using ( auth.uid() = user_id );

create policy "Users can update own profile"
  on public.profiles for update
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );`,
    },
  },
  {
    id: "find_stripe_sig",
    pillar: "revenue",
    severity: "high",
    status: "open",
    title: "Stripe webhook does not verify signatures",
    humanSummary:
      "Your payment webhook trusts any request that hits it. Someone could fake a 'payment succeeded' event and unlock paid features for free.",
    businessImpact:
      "Attackers can grant themselves subscriptions or credits without paying, and spoof refunds — direct revenue loss and corrupted billing state.",
    scanner: "semgrep",
    evidence: "semgrep: stripe-webhook-no-constructEvent · raw body parsed without signature check",
    recommendation:
      "Verify the Stripe-Signature header with stripe.webhooks.constructEvent() using your webhook signing secret before processing any event.",
    scoreDelta: 12,
    detectedAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
    resource: "src/app/api/webhooks/stripe/route.ts",
    context: {
      path: "src/app/api/webhooks/stripe/route.ts",
      language: "tsx",
      startLine: 6,
      snippet: `export async function POST(req: Request) {
  // ❌ No signature verification — trusts any caller
  const event = await req.json();

  if (event.type === "checkout.session.completed") {
    await grantSubscription(event.data.object.customer);
  }
  return Response.json({ received: true });
}`,
      proposed: `export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature")!;
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    await grantSubscription(event.data.object.customer as string);
  }
  return Response.json({ received: true });
}`,
    },
  },
  {
    id: "find_loop",
    pillar: "finops",
    severity: "medium",
    status: "open",
    title: "Potential infinite useEffect render loop",
    humanSummary:
      "A screen re-runs an effect every render because it depends on a value it also changes. This can fire API calls in a tight loop.",
    businessImpact:
      "A runaway loop can hammer your paid APIs and database thousands of times a minute, spiking your bill and potentially taking the app down.",
    scanner: "tree-sitter",
    evidence: "tree-sitter + semgrep: effect sets state present in its own dependency array",
    recommendation:
      "Remove the derived value from the dependency array or memoize it, so the effect runs only when its real inputs change.",
    scoreDelta: 6,
    detectedAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
    resource: "src/components/UsageDashboard.tsx",
    context: {
      path: "src/components/UsageDashboard.tsx",
      language: "tsx",
      startLine: 18,
      snippet: `const [data, setData] = useState([]);

useEffect(() => {
  fetchUsage().then((rows) => setData(rows));
  // ❌ 'data' changes every run → effect re-fires forever
}, [data]);`,
      proposed: `const [data, setData] = useState([]);

useEffect(() => {
  fetchUsage().then((rows) => setData(rows));
  // ✅ run once on mount; refetch on real inputs only
}, []);`,
    },
  },
  {
    id: "find_unprotected_route",
    pillar: "finops",
    severity: "high",
    status: "open",
    title: "Unprotected paid AI route: /api/ai/generate",
    humanSummary:
      "An endpoint that calls a paid AI provider has no authentication and no rate limiting. Anyone can call it as fast as they like.",
    businessImpact:
      "A single script could run up thousands of dollars in OpenAI charges in minutes — a classic denial-of-wallet attack.",
    scanner: "semgrep",
    evidence: "semgrep: paid-provider-call in route with no auth guard, no rate limiter",
    recommendation:
      "Add authentication and a rate-limit middleware (e.g. Upstash token bucket, 10 req/min per user) in front of this route.",
    scoreDelta: 8,
    detectedAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
    resource: "src/app/api/ai/generate/route.ts",
    context: {
      path: "src/app/api/ai/generate/route.ts",
      language: "tsx",
      startLine: 4,
      snippet: `export async function POST(req: Request) {
  const { prompt } = await req.json();
  // ❌ no auth, no rate limit — calls a paid provider
  const out = await openai.responses.create({ model: "gpt-4o", input: prompt });
  return Response.json(out);
}`,
      proposed: `export async function POST(req: Request) {
  const user = await requireUser(req);
  const { success } = await ratelimit.limit(user.id);
  if (!success) return new Response("Too many requests", { status: 429 });

  const { prompt } = await req.json();
  const out = await openai.responses.create({ model: "gpt-4o", input: prompt });
  return Response.json(out);
}`,
    },
  },
  {
    id: "find_permissive_orders",
    pillar: "security",
    severity: "medium",
    status: "open",
    title: "Permissive RLS policy USING(true) on public.orders",
    humanSummary:
      "The orders table has RLS turned on but its policy allows everyone through, which defeats the purpose.",
    businessImpact:
      "Any authenticated user can read all customers' orders — order totals, items and addresses are exposed across accounts.",
    scanner: "supabase",
    evidence: "pg_policies: orders_select USING (true) for role authenticated",
    recommendation:
      "Scope the SELECT policy to the owner with auth.uid() = user_id after confirming the ownership column.",
    scoreDelta: 5,
    detectedAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
    resource: "public.orders",
    context: {
      path: "supabase/policies/orders.sql",
      language: "sql",
      startLine: 1,
      snippet: `create policy "orders_select"
  on public.orders for select
  to authenticated
  using ( true );  -- ❌ allows every authenticated user`,
      proposed: `create policy "orders_select"
  on public.orders for select
  to authenticated
  using ( auth.uid() = user_id );  -- ✅ owner-scoped`,
    },
  },
  {
    id: "find_monolith",
    pillar: "code-health",
    severity: "low",
    status: "open",
    title: "Monolith file over 2,000 lines",
    humanSummary:
      "One file holds 2,480 lines. Large files are hard for AI tools to edit accurately and slow down reviews.",
    businessImpact:
      "AI agents lose context in huge files and introduce regressions. Splitting improves AI-assisted change safety.",
    scanner: "tree-sitter",
    evidence: "tree-sitter: 2,480 lines · 38 components in a single module",
    recommendation:
      "Split dashboard/page.tsx into feature components and co-locate hooks. Add a size guard to CI.",
    scoreDelta: 3,
    detectedAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
    resource: "src/app/dashboard/page.tsx",
  },
  {
    id: "find_missing_rules",
    pillar: "code-health",
    severity: "low",
    status: "open",
    title: "Missing security rules in AI context files",
    humanSummary:
      "Your .cursorrules and CLAUDE.md don't tell AI tools about your security requirements, so they may reintroduce fixed issues.",
    businessImpact:
      "Without rules, an AI tool can re-add a service-role key or disable RLS on its next edit — undoing remediation.",
    scanner: "semgrep",
    evidence: "context analysis: no RLS / secret-handling guidance found in rules files",
    recommendation:
      "Sync generated security rules into .cursorrules, .windsurfrules and CLAUDE.md so AI edits respect your guardrails.",
    scoreDelta: 2,
    detectedAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
    resource: "CLAUDE.md",
  },
];

const now = Date.now();
export const DEMO_READINESS: ReadinessState = {
  score: 72,
  previousScore: 64,
  potentialGain: 23,
  lastScanAt: new Date(now - 2 * 3600_000).toISOString(),
  origin: "demo",
  history: [
    { at: new Date(now - 11 * 86400_000).toISOString(), score: 48 },
    { at: new Date(now - 9 * 86400_000).toISOString(), score: 52 },
    { at: new Date(now - 7 * 86400_000).toISOString(), score: 51 },
    { at: new Date(now - 5 * 86400_000).toISOString(), score: 59 },
    { at: new Date(now - 3 * 86400_000).toISOString(), score: 64 },
    { at: new Date(now - 1 * 86400_000).toISOString(), score: 68 },
    { at: new Date(now - 2 * 3600_000).toISOString(), score: 72 },
  ],
  pillars: [
    { pillar: "security", score: 58, status: "critical", openFindings: 3 },
    { pillar: "finops", score: 69, status: "attention", openFindings: 2 },
    { pillar: "revenue", score: 66, status: "attention", openFindings: 1 },
    { pillar: "code-health", score: 84, status: "healthy", openFindings: 2 },
  ],
};

export const DEMO_SCANS: Scan[] = [
  {
    id: "scan_latest",
    repositoryId: "repo_saas",
    status: "completed",
    startedAt: new Date(now - 2 * 3600_000 - 92_000).toISOString(),
    finishedAt: new Date(now - 2 * 3600_000).toISOString(),
    durationMs: 92_000,
    scanners: ["gitleaks", "semgrep", "tree-sitter", "supabase", "live-url"],
    branch: "main",
    commitSha: "a3f9c21",
    findingCount: 8,
    origin: "demo",
  },
  {
    id: "scan_prev",
    repositoryId: "repo_saas",
    status: "completed",
    startedAt: new Date(now - 1 * 86400_000 - 88_000).toISOString(),
    finishedAt: new Date(now - 1 * 86400_000).toISOString(),
    durationMs: 88_000,
    scanners: ["gitleaks", "semgrep", "tree-sitter", "supabase"],
    branch: "main",
    commitSha: "7b1e004",
    findingCount: 11,
    origin: "demo",
  },
  {
    id: "scan_partial",
    repositoryId: "repo_saas",
    status: "partial",
    startedAt: new Date(now - 3 * 86400_000 - 60_000).toISOString(),
    finishedAt: new Date(now - 3 * 86400_000).toISOString(),
    durationMs: 60_000,
    scanners: ["gitleaks", "semgrep", "tree-sitter"],
    branch: "main",
    commitSha: "c90aa11",
    findingCount: 9,
    origin: "demo",
  },
];

export const DEMO_SCAN_EVENTS: ScanEvent[] = buildScanEvents("scan_latest");

function buildScanEvents(scanId: string): ScanEvent[] {
  const base = now - 2 * 3600_000 - 92_000;
  const e = (
    t: number,
    scanner: ScanEvent["scanner"],
    level: ScanEvent["level"],
    message: string,
    path?: string,
    line?: number,
  ): ScanEvent => ({
    id: `${scanId}_${t}`,
    scanId,
    at: new Date(base + t * 1000).toISOString(),
    scanner,
    level,
    message,
    path,
    line,
  });
  return [
    e(1, "gitleaks", "phase", "Repository access confirmed · alex-tech/saas-starter"),
    e(2, "gitleaks", "info", "Cloning @ main (a3f9c21) · 1,284 files"),
    e(6, "gitleaks", "info", "Scanning full git history (482 commits)"),
    e(12, "gitleaks", "fail", "Exposed service role key", "src/lib/supabaseClient.ts", 14),
    e(14, "gitleaks", "check", "Secret scan complete · 1 finding"),
    e(16, "semgrep", "phase", "Static analysis · 142 custom YAML rules"),
    e(22, "semgrep", "warn", "Unprotected paid route", "src/app/api/ai/generate/route.ts", 4),
    e(28, "semgrep", "fail", "Stripe webhook missing signature check", "src/app/api/webhooks/stripe/route.ts", 6),
    e(34, "semgrep", "check", "Static analysis complete · 2 findings"),
    e(36, "tree-sitter", "phase", "AST analysis · render / effect graph"),
    e(41, "tree-sitter", "warn", "Potential effect loop", "src/components/UsageDashboard.tsx", 20),
    e(46, "tree-sitter", "info", "Monolith file 2,480 lines", "src/app/dashboard/page.tsx"),
    e(49, "tree-sitter", "check", "AST analysis complete · 2 findings"),
    e(52, "supabase", "phase", "Database inspection · pg_tables / pg_policies"),
    e(58, "supabase", "fail", "RLS disabled on public.profiles"),
    e(63, "supabase", "warn", "Permissive policy USING(true) on public.orders"),
    e(68, "supabase", "check", "Database inspection complete · 2 findings"),
    e(70, "live-url", "phase", "Live probe · https://saas-starter.vercel.app"),
    e(78, "live-url", "info", "Headers inspected · 0 critical exposures"),
    e(86, "live-url", "check", "Live probe complete"),
    e(92, "live-url", "phase", "Scan complete · 8 findings · readiness 72"),
  ];
}

export const DEMO_PULL_REQUESTS: PullRequest[] = [
  {
    id: "pr_241",
    findingId: "find_rls_profiles",
    number: 241,
    url: "https://github.com/alex-tech/saas-starter/pull/241",
    title: "fix(security): enable RLS and owner policies on profiles",
    state: "merged",
    branch: "vibeshield/rls-profiles",
    checks: [
      { name: "build", status: "passed" },
      { name: "typecheck", status: "passed" },
      { name: "migration", status: "passed" },
    ],
    openedAt: new Date(now - 26 * 3600_000).toISOString(),
    mergedAt: new Date(now - 24 * 3600_000).toISOString(),
  },
  {
    id: "pr_244",
    findingId: "find_stripe_sig",
    number: 244,
    url: "https://github.com/alex-tech/saas-starter/pull/244",
    title: "fix(revenue): verify Stripe webhook signatures",
    state: "checks-running",
    branch: "vibeshield/stripe-webhook-verify",
    checks: [
      { name: "build", status: "passed" },
      { name: "typecheck", status: "pending" },
    ],
    openedAt: new Date(now - 40 * 60_000).toISOString(),
  },
];

export const DEMO_VERIFICATION: VerificationBadge = {
  state: "unverified",
  score: 72,
  publicUrl: "https://vibeshield.dev/v/alex-tech/saas-starter",
  embedCode:
    '<a href="https://vibeshield.dev/v/alex-tech/saas-starter"><img src="https://vibeshield.dev/badge/alex-tech/saas-starter.svg" alt="VibeShield readiness" /></a>',
};
