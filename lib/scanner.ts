import "server-only";
import { randomUUID } from "node:crypto";
import type {
  Finding,
  ScanEvent,
  ScannerKind,
  Pillar,
  Severity,
  ScanStatus,
} from "./types";
import type { FileEntry, RepoSource, SourceInfo } from "./source";

/* ============================================================================
   VibeShield static rules — pattern and heuristic checks over the CURRENT file
   contents of a source. Not Gitleaks, Semgrep or Tree-sitter: there is no git
   history scan, no AST and no live database inspection. Real tool-backed
   scanners arrive with the worker stage. Findings, line numbers, snippets and
   the readiness score are computed from the actual source — not fixtures.
   ========================================================================== */

export interface ScanResult {
  scanId: string;
  source: SourceInfo;
  status: ScanStatus;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  scanners: ScannerKind[];
  fileCount: number;
  findings: Finding[];
  events: ScanEvent[];
  score: number;
  pillars: Record<Pillar, number>;
  error?: string;
}

const PENALTY: Record<Severity, number> = { critical: 20, high: 12, medium: 6, low: 2, info: 0 };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function lineOf(content: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < content.length; i++) if (content[i] === "\n") line++;
  return line;
}

function snippet(content: string, startLine: number, span = 5): { text: string; start: number } {
  const lines = content.split("\n");
  const from = Math.max(0, startLine - 2);
  const to = Math.min(lines.length, from + span);
  return { text: lines.slice(from, to).join("\n"), start: from + 1 };
}

function redact(text: string): string {
  return text
    .replace(/sk_live_[A-Za-z0-9]{6,}/g, "sk_live_••••••redacted")
    .replace(/sk-[A-Za-z0-9]{10,}/g, "sk-••••••redacted")
    .replace(/AKIA[0-9A-Z]{10,}/g, "AKIA••••redacted")
    .replace(/(SERVICE_ROLE\s*=\s*)\S+/g, "$1••••••redacted")
    .replace(/(eyJ[A-Za-z0-9_-]{6,})\.[A-Za-z0-9_.-]+/g, "$1.••••redacted");
}

function fid(rule: string, path: string, line: number): string {
  return `f_${rule}_${Math.abs(hash(path + ":" + line + ":" + rule))}`;
}
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

type RawFinding = Omit<Finding, "detectedAt" | "status">;

// ---- Rules -------------------------------------------------------------------

function isClientReachable(path: string): boolean {
  return /\.(tsx|jsx)$/.test(path) || /\/(components|app|pages|lib|utils|hooks)\//.test(path);
}
function isApiRoute(path: string): boolean {
  return /\/api\/.*route\.(ts|js|mjs)$/.test(path) || /\/pages\/api\//.test(path);
}

function secretRules(files: FileEntry[]): RawFinding[] {
  const out: RawFinding[] = [];
  for (const f of files) {
    // Exposed Supabase service role key in client-reachable code or committed env
    const svc = f.content.match(/NEXT_PUBLIC_[A-Z_]*SERVICE_ROLE/);
    if (svc && (isClientReachable(f.path) || f.path.includes(".env") || /supabase/i.test(f.content))) {
      const line = lineOf(f.content, svc.index!);
      const sn = snippet(f.content, line);
      out.push({
        id: fid("servicekey", f.path, line),
        pillar: "security",
        severity: "critical",
        scanner: "static-rules",
        title: "Exposed Supabase service role key",
        humanSummary:
          "Your database admin key is reachable from the browser (NEXT_PUBLIC). Anyone visiting your site can read it and gain full, unrestricted database access.",
        businessImpact:
          "An attacker could read, modify or delete every row in your database — all user data, payments and secrets — bypassing every security rule.",
        evidence: `secret rule: NEXT_PUBLIC_*_SERVICE_ROLE referenced in ${f.path}`,
        recommendation:
          "Use the publishable (anon) key in client code; keep the service role key in a server-only env var and rotate the exposed key.",
        scoreDelta: PENALTY.critical,
        resource: f.path,
        context: {
          path: f.path,
          language: lang(f.path),
          startLine: sn.start,
          snippet: redact(sn.text),
          proposed: redact(sn.text)
            .replace(/NEXT_PUBLIC_[A-Z_]*SERVICE_ROLE/g, "NEXT_PUBLIC_SUPABASE_ANON_KEY")
            .replace(/supabaseKey/g, "supabaseAnonKey"),
        },
      });
    }
    // Hardcoded secrets
    const patterns: { re: RegExp; label: string; sev: Severity }[] = [
      { re: /sk_live_[A-Za-z0-9]{8,}/, label: "Stripe live secret key", sev: "critical" },
      { re: /sk-[A-Za-z0-9]{20,}/, label: "OpenAI API key", sev: "high" },
      { re: /AKIA[0-9A-Z]{16}/, label: "AWS access key id", sev: "high" },
    ];
    for (const p of patterns) {
      const m = f.content.match(p.re);
      if (m) {
        const line = lineOf(f.content, m.index!);
        const sn = snippet(f.content, line, 3);
        out.push({
          id: fid("secret_" + p.label, f.path, line),
          pillar: "security",
          severity: p.sev,
          scanner: "static-rules",
          title: `Hardcoded ${p.label}`,
          humanSummary: `A ${p.label} is committed in plain text in your repository. Anyone with repo access — or who finds it in git history — can use it.`,
          businessImpact:
            "Committed credentials are a top cause of breaches and surprise bills. The key should be rotated and moved to a secret store.",
          evidence: `secret rule: ${p.label} pattern in ${f.path}:${line}`,
          recommendation: "Remove the key from source, rotate it, and load it from an environment secret instead.",
          scoreDelta: PENALTY[p.sev],
          resource: f.path,
          context: { path: f.path, language: lang(f.path), startLine: sn.start, snippet: redact(sn.text) },
        });
      }
    }
  }
  return out;
}

function semgrepRules(files: FileEntry[]): RawFinding[] {
  const out: RawFinding[] = [];
  for (const f of files) {
    // Stripe webhook without signature verification
    const looksWebhook = /webhook/i.test(f.path) && /stripe/i.test(f.path + f.content);
    if (looksWebhook && !/constructEvent/.test(f.content)) {
      const m = f.content.match(/export\s+async\s+function\s+POST/) ?? { index: 0 };
      const line = lineOf(f.content, (m as RegExpMatchArray).index ?? 0);
      const sn = snippet(f.content, line, 8);
      out.push({
        id: fid("stripesig", f.path, line),
        pillar: "revenue",
        severity: "high",
        scanner: "static-rules",
        title: "Stripe webhook does not verify signatures",
        humanSummary:
          "Your payment webhook trusts any request that hits it. Someone could fake a 'payment succeeded' event and unlock paid features for free.",
        businessImpact:
          "Attackers can grant themselves subscriptions without paying and spoof events — direct revenue loss and corrupted billing state.",
        evidence: `code rule: stripe-webhook-no-constructEvent in ${f.path}`,
        recommendation:
          "Verify the Stripe-Signature header with stripe.webhooks.constructEvent() using your signing secret before processing any event.",
        scoreDelta: PENALTY.high,
        resource: f.path,
        context: {
          path: f.path,
          language: lang(f.path),
          startLine: sn.start,
          snippet: sn.text,
          proposed: `export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature")!;
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }
  // ...handle event
  return Response.json({ received: true });
}`,
        },
      });
    }
    // Unprotected paid API route
    if (isApiRoute(f.path)) {
      const provider = detectProvider(f.content);
      const hasLimit = /ratelimit|rateLimit|\.limit\(|Ratelimit/.test(f.content);
      const hasAuth = /requireUser|getUser\(|auth\(\)|getSession|currentUser/.test(f.content);
      if (provider && (!hasLimit || !hasAuth)) {
        const m = f.content.match(/export\s+async\s+function\s+(POST|GET|PUT)/) ?? { index: 0 };
        const line = lineOf(f.content, (m as RegExpMatchArray).index ?? 0);
        const sn = snippet(f.content, line, 6);
        out.push({
          id: fid("route", f.path, line),
          pillar: "finops",
          severity: !hasAuth ? "high" : "medium",
          scanner: "static-rules",
          title: `Unprotected paid route: ${routeLabel(f.path)}`,
          humanSummary: `An endpoint that calls ${provider} ${!hasAuth ? "has no authentication and " : ""}no rate limiting. It can be called repeatedly at will.`,
          businessImpact:
            "A single script could run up large provider charges in minutes — a classic denial-of-wallet attack.",
          evidence: `code rule: paid-provider (${provider}) in ${f.path} without ${!hasAuth ? "auth + " : ""}rate limit`,
          recommendation: "Add authentication and a rate-limit middleware (e.g. Upstash token bucket) in front of this route.",
          scoreDelta: !hasAuth ? PENALTY.high : PENALTY.medium,
          resource: f.path,
          context: {
            path: f.path,
            language: lang(f.path),
            startLine: sn.start,
            snippet: sn.text,
            proposed: `export async function POST(req: Request) {
  const user = await requireUser(req);
  const { success } = await ratelimit.limit(user.id);
  if (!success) return new Response("Too many requests", { status: 429 });
  // ...existing paid-provider call
}`,
          },
        });
      }
    }
  }
  return out;
}

function treeSitterRules(files: FileEntry[]): RawFinding[] {
  const out: RawFinding[] = [];
  for (const f of files) {
    // Monolith
    if (f.lines > 2000) {
      out.push({
        id: fid("monolith", f.path, 1),
        pillar: "code-health",
        severity: "low",
        scanner: "static-rules",
        title: "Monolith file over 2,000 lines",
        humanSummary: `${f.path} is ${f.lines.toLocaleString()} lines. Large files are hard for AI tools to edit accurately and slow reviews.`,
        businessImpact: "AI agents lose context in huge files and introduce regressions. Splitting improves change safety.",
        evidence: `structure rule: ${f.lines.toLocaleString()} lines in ${f.path}`,
        recommendation: "Split the file into feature components and add a size guard to CI.",
        scoreDelta: PENALTY.low,
        resource: f.path,
      });
    }
    // Infinite useEffect loop (heuristic)
    if (/\.(tsx|jsx|ts|js)$/.test(f.path)) {
      const re = /useEffect\(\s*\(\s*\)\s*=>\s*\{([\s\S]*?)\}\s*,\s*\[([^\]]*)\]\s*\)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(f.content))) {
        const body = m[1];
        const deps = m[2].split(",").map((d) => d.trim()).filter(Boolean);
        const setters = [...body.matchAll(/set([A-Z]\w*)\s*\(/g)].map(
          (s) => s[1][0].toLowerCase() + s[1].slice(1),
        );
        const culprit = deps.find((d) => setters.includes(d));
        if (culprit) {
          const line = lineOf(f.content, m.index);
          const sn = snippet(f.content, line, 6);
          out.push({
            id: fid("loop", f.path, line),
            pillar: "finops",
            severity: "medium",
            scanner: "static-rules",
            title: "Potential infinite useEffect render loop",
            humanSummary: `An effect updates '${culprit}' but also lists it as a dependency, so it can re-run every render and fire its calls in a loop.`,
            businessImpact:
              "A runaway loop can hammer paid APIs and the database thousands of times a minute, spiking your bill and risking downtime.",
            evidence: `structure rule: effect sets '${culprit}' which is in its own dependency array (${f.path}:${line})`,
            recommendation: `Remove '${culprit}' from the dependency array or memoize it so the effect runs only when its real inputs change.`,
            scoreDelta: PENALTY.medium,
            resource: f.path,
            context: {
              path: f.path,
              language: lang(f.path),
              startLine: sn.start,
              snippet: sn.text,
              proposed: sn.text.replace(/,\s*\[[^\]]*\]\s*\)/, ", [])"),
            },
          });
        }
      }
    }
  }
  return out;
}

function supabaseRules(files: FileEntry[]): RawFinding[] {
  const out: RawFinding[] = [];
  for (const f of files) {
    if (!f.path.endsWith(".sql")) continue;
    // Permissive policy using(true)
    const perm = f.content.match(/using\s*\(\s*true\s*\)/i);
    if (perm) {
      const line = lineOf(f.content, perm.index!);
      const table = tableFromPolicy(f.content, perm.index!);
      const sn = snippet(f.content, line, 5);
      out.push({
        id: fid("permissive", f.path, line),
        pillar: "security",
        severity: "medium",
        scanner: "static-rules",
        title: `Permissive RLS policy USING(true)${table ? ` on ${table}` : ""}`,
        humanSummary: "A row-level-security policy allows every authenticated user through, which defeats its purpose.",
        businessImpact: "Any logged-in user can read all rows for this table — data is exposed across accounts.",
        evidence: `SQL rule: USING (true) policy in ${f.path}:${line}`,
        recommendation: "Scope the policy to the owner, e.g. using ( auth.uid() = user_id ), after confirming the ownership column.",
        scoreDelta: PENALTY.medium,
        resource: table ?? f.path,
        context: {
          path: f.path,
          language: "sql",
          startLine: sn.start,
          snippet: sn.text,
          proposed: sn.text.replace(/using\s*\(\s*true\s*\)/i, "using ( auth.uid() = user_id )"),
        },
      });
    }
    // RLS not enabled for a created table
    const createMatch = f.content.match(/create\s+table[^;]*public\.(\w+)/i);
    if (createMatch && !/enable\s+row\s+level\s+security/i.test(f.content)) {
      const line = lineOf(f.content, createMatch.index!);
      const table = `public.${createMatch[1]}`;
      const sn = snippet(f.content, line, 5);
      out.push({
        id: fid("rls", f.path, line),
        pillar: "security",
        severity: "high",
        scanner: "static-rules",
        title: `Row Level Security not enabled on ${table}`,
        humanSummary: `The ${table} table is created without RLS, so it has no access rules — any authenticated user can read and edit everyone's rows.`,
        businessImpact: "Private user data is readable and editable across accounts — a direct data-privacy breach.",
        evidence: `SQL rule: no 'enable row level security' for ${table} found in ${f.path}`,
        recommendation: "Enable RLS and add owner-scoped policies (auth.uid() = user_id).",
        scoreDelta: PENALTY.high,
        resource: table,
        context: {
          path: f.path,
          language: "sql",
          startLine: sn.start,
          snippet: sn.text,
          proposed: `alter table ${table} enable row level security;

create policy "${createMatch[1]}_owner_select"
  on ${table} for select
  using ( auth.uid() = user_id );`,
        },
      });
    }
  }
  return out;
}

function contextRules(files: FileEntry[]): RawFinding[] {
  const names = new Set(files.map((f) => f.path.split("/").pop()));
  const ruleFiles = files.filter((f) => [".cursorrules", ".windsurfrules", "CLAUDE.md"].includes(f.path.split("/").pop() ?? ""));
  const hasSecurity = ruleFiles.some((f) => /rls|service_role|rate.?limit|constructEvent|auth\.uid/i.test(f.content));
  if (!hasSecurity) {
    return [
      {
        id: fid("rules", "root", 1),
        pillar: "code-health",
        severity: "low",
        scanner: "static-rules",
        title: "Missing security rules in AI context files",
        humanSummary:
          "Your AI rules files don't tell tools like Cursor and Claude about your security requirements, so they may reintroduce fixed issues.",
        businessImpact: "Without rules, an AI tool can re-add a service-role key or disable RLS on its next edit — undoing remediation.",
        evidence: names.has(".cursorrules") || names.has("CLAUDE.md")
          ? "context analysis: rules files present but contain no security guidance"
          : "context analysis: no .cursorrules / CLAUDE.md found",
        recommendation: "Sync generated security rules into .cursorrules, .windsurfrules and CLAUDE.md.",
        scoreDelta: PENALTY.low,
        resource: "CLAUDE.md",
      },
    ];
  }
  return [];
}

// ---- helpers -----------------------------------------------------------------

function lang(path: string): string {
  if (path.endsWith(".sql")) return "sql";
  if (path.endsWith(".md")) return "markdown";
  if (/\.(tsx|ts)$/.test(path)) return "tsx";
  if (/\.(jsx|js|mjs|cjs)$/.test(path)) return "jsx";
  return "tsx";
}
function detectProvider(content: string): string | null {
  if (/openai|\.responses\.create|gpt-4/i.test(content)) return "OpenAI";
  if (/anthropic|\.messages\.create|claude-/i.test(content)) return "Anthropic";
  if (/elevenlabs/i.test(content)) return "ElevenLabs";
  if (/replicate/i.test(content)) return "Replicate";
  return null;
}
function routeLabel(path: string): string {
  const m = path.match(/\/api\/(.+?)\/route\.(ts|js|mjs)$/);
  return m ? "/api/" + m[1] : path;
}
function tableFromPolicy(content: string, idx: number): string | null {
  const before = content.slice(0, idx);
  const m = [...before.matchAll(/on\s+(public\.\w+|\w+)/gi)].pop();
  return m ? m[1] : null;
}

// ---- scoring -----------------------------------------------------------------

const PILLARS: Pillar[] = ["security", "finops", "revenue", "code-health"];

const PILLAR_WEIGHT: Record<Pillar, number> = {
  security: 0.35,
  finops: 0.25,
  revenue: 0.25,
  "code-health": 0.15,
};

export function score(findings: Finding[]): { score: number; pillars: Record<Pillar, number> } {
  const pillars = {} as Record<Pillar, number>;
  for (const p of PILLARS) {
    const pen = findings.filter((f) => f.pillar === p).reduce((n, f) => n + PENALTY[f.severity], 0);
    pillars[p] = Math.max(15, 100 - pen);
  }
  // Overall is a weighted blend of the pillar scores (consistent with the UI).
  const overall = PILLARS.reduce((n, p) => n + pillars[p] * PILLAR_WEIGHT[p], 0);
  return { score: Math.round(Math.max(0, Math.min(100, overall))), pillars };
}

// ---- orchestration -----------------------------------------------------------

interface Phase {
  scanner: ScannerKind;
  label: string;
  run: (files: FileEntry[]) => RawFinding[];
}

const PHASES: Phase[] = [
  { scanner: "static-rules", label: "Secret patterns in current files", run: secretRules },
  { scanner: "static-rules", label: "Code rules: auth, webhooks, paid routes", run: semgrepRules },
  { scanner: "static-rules", label: "Structure heuristics: effects, file size", run: treeSitterRules },
  { scanner: "static-rules", label: "SQL policy rules in repo files", run: supabaseRules },
];

export async function runScan(
  source: RepoSource,
  emit: (e: ScanEvent) => void | Promise<void>,
  opts: { pace?: boolean } = {},
): Promise<ScanResult> {
  let seq = 0;
  const scanId = `scan_${Date.now().toString(36)}_${randomUUID().slice(0, 8)}`;
  const started = Date.now();
  const events: ScanEvent[] = [];
  const pace = opts.pace ?? true;

  const push = async (
    scanner: ScannerKind,
    level: ScanEvent["level"],
    message: string,
    path?: string,
    line?: number,
  ) => {
    const e: ScanEvent = {
      id: `${scanId}_${seq++}`,
      scanId,
      at: new Date().toISOString(),
      scanner,
      level,
      message,
      path,
      line,
    };
    events.push(e);
    await emit(e);
    if (pace) await sleep(level === "phase" ? 320 : 120);
  };

  let files: FileEntry[];
  try {
    await push("static-rules", "phase", `Reading source · ${source.info.label}`);
    files = await source.load();
    await push("static-rules", "info", `Loaded ${files.length} files @ ${source.info.branch}${source.info.commit ? ` (${source.info.commit})` : ""}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "source unavailable";
    await push("static-rules", "fail", `Scan could not start: ${message}`);
    const finished = Date.now();
    const empty = score([]);
    return {
      scanId, source: source.info, status: "failed",
      startedAt: new Date(started).toISOString(), finishedAt: new Date(finished).toISOString(),
      durationMs: finished - started, scanners: [], fileCount: 0,
      findings: [], events, score: 0,
      pillars: empty.pillars, error: message,
    };
  }

  const allFindings: Finding[] = [];
  const now = () => new Date().toISOString();

  for (const phase of PHASES) {
    await push(phase.scanner, "phase", phase.label);
    const raw = phase.run(files);
    for (const r of raw) {
      const finding: Finding = { ...r, status: "open", detectedAt: now() };
      allFindings.push(finding);
      await push(
        phase.scanner,
        finding.severity === "critical" || finding.severity === "high" ? "fail" : "warn",
        finding.title,
        finding.context?.path ?? finding.resource,
        finding.context?.startLine,
      );
    }
    await push(phase.scanner, "check", `${phase.label} · done ·${raw.length} ${raw.length === 1 ? "finding" : "findings"}`);
  }

  for (const r of contextRules(files)) {
    allFindings.push({ ...r, status: "open", detectedAt: now() });
  }

  const { score: readiness, pillars } = score(allFindings);
  const finished = Date.now();
  await push("static-rules", "phase", `Scan complete · ${allFindings.length} findings · readiness ${readiness}`);

  return {
    scanId,
    source: source.info,
    status: "completed",
    startedAt: new Date(started).toISOString(),
    finishedAt: new Date(finished).toISOString(),
    durationMs: finished - started,
    scanners: ["static-rules"],
    fileCount: files.length,
    findings: allFindings,
    events,
    score: readiness,
    pillars,
  };
}
