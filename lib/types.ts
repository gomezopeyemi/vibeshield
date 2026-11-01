/* ============================================================================
   VibeShield — shared, typed data contracts.
   These interfaces are the single source of truth for every screen. Server
   responses are validated against zod schemas (see lib/data/*) before they are
   trusted. Never use `any` to paper over a missing contract.
   ========================================================================== */

// ---- Primitive unions --------------------------------------------------------

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type Pillar =
  | "security"
  | "finops"
  | "revenue"
  | "code-health";

export type PlanTier = "free" | "builder" | "pro" | "team";

export type ConnectionStatus =
  | "connected"
  | "disconnected"
  | "error"
  | "pending"
  | "expired"
  | "unauthorized";

export type ScanStatus =
  | "queued"
  | "running"
  | "completed"
  | "partial"
  | "failed"
  | "cancelled";

export type ScannerKind =
  | "static-rules"
  | "gitleaks"
  | "semgrep"
  | "tree-sitter"
  | "supabase"
  | "live-url"
  | "nuclei";

export type ScanEventLevel = "info" | "check" | "warn" | "fail" | "phase";

export type FindingStatus =
  | "open"
  | "fix-proposed"
  | "pr-open"
  | "pr-merged"
  | "resolved"
  | "verifying"
  | "regressed"
  | "dismissed";

export type PrState = "draft" | "open" | "checks-running" | "checks-failed" | "approved" | "merged" | "closed";

export type AiTool = "cursor" | "lovable" | "bolt" | "v0" | "windsurf" | "replit" | "claude-code";

export type AiProvider = "openai" | "anthropic" | "elevenlabs" | "replicate" | "resend";

export type SmokeStatus =
  | "queued"
  | "starting"
  | "running"
  | "passed"
  | "failed"
  | "timed-out"
  | "unavailable";

export type McpClient = "cursor" | "windsurf" | "claude-code";

/** Discriminates genuinely empty-but-successful results from demo fixtures and
 *  from stale/failed data. Honesty requirement from the master spec. */
export type DataOrigin = "live" | "demo" | "stale" | "unavailable";

// ---- Auth --------------------------------------------------------------------

/** supabase: real accounts · demo: auth not configured, fixture session (dev/demo only) · unconfigured: fail closed. */
export type AuthMode = "supabase" | "demo" | "unconfigured";

/** The verified identity handed to UI. Only non-sensitive fields. */
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  demo: boolean;
}

// ---- Public site -------------------------------------------------------------

/** available: works today · preview: UI with labelled demo data · building: not usable yet. */
export type CapabilityStatus = "available" | "preview" | "building";

export interface Capability {
  label: string;
  detail: string;
  status: CapabilityStatus;
}

export interface ProductModule {
  key: string;
  name: string;
  summary: string;
  icon: string;
  capabilities: Capability[];
}

// ---- Core entities -----------------------------------------------------------

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  plan: PlanTier;
}

/** Mirrors the `public.workspace_role` enum (supabase/migrations). */
export type WorkspaceRole = "owner" | "admin" | "developer" | "viewer";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: PlanTier;
  memberCount: number;
  /** The signed-in user's role here; absent for demo fixtures. */
  role?: WorkspaceRole;
}

export interface WorkspaceMember {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  fullName: string;
  joinedAt: string;
}

export interface Repository {
  id: string;
  owner: string;
  name: string;
  fullName: string; // owner/name
  defaultBranch: string;
  private: boolean;
  liveUrl?: string;
  stagingUrl?: string;
  connection: ConnectionStatus;
  lastScanAt?: string;
}

export interface Integration {
  id: string;
  provider: "github" | "supabase" | "vercel" | "stripe" | AiProvider;
  label: string;
  status: ConnectionStatus;
  scope?: string[];
  connectedAt?: string;
  lastHeartbeatAt?: string;
  /** What the user must do when not connected. Honest guidance, never faked. */
  remediation?: string;
}

export interface ScanEvent {
  id: string;
  scanId: string;
  at: string;
  scanner: ScannerKind;
  level: ScanEventLevel;
  message: string;
  path?: string;
  line?: number;
}

export interface Scan {
  id: string;
  repositoryId: string;
  status: ScanStatus;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  scanners: ScannerKind[];
  branch: string;
  commitSha?: string;
  findingCount: number;
  origin: DataOrigin;
}

export interface ScoreSnapshot {
  id: string;
  at: string;
  score: number; // 0-100
  pillars: Record<Pillar, number>;
  scanId: string;
}

export interface CodeContext {
  path: string;
  language: string;
  startLine: number;
  snippet: string; // already secret-redacted
  proposed?: string;
}

export interface Finding {
  id: string;
  pillar: Pillar;
  severity: Severity;
  status: FindingStatus;
  title: string;
  /** Plain-English translation of the problem. */
  humanSummary: string;
  /** Real-world business impact. */
  businessImpact: string;
  scanner: ScannerKind;
  evidence: string;
  context?: CodeContext;
  recommendation: string;
  /** Projected readiness points if resolved, when supplied by scoring engine. */
  scoreDelta?: number;
  detectedAt: string;
  resource?: string; // table name, api route, policy, etc.
}

export interface FixProposal {
  id: string;
  findingId: string;
  kind: "github-pr" | "sql-migration" | "ai-prompt" | "middleware";
  summary: string;
  files: { path: string; additions: number; deletions: number }[];
  diff?: string;
  validated: boolean;
  createdAt: string;
}

export interface PullRequest {
  id: string;
  findingId: string;
  number: number;
  url: string;
  title: string;
  state: PrState;
  branch: string;
  checks: { name: string; status: "pending" | "passed" | "failed" }[];
  openedAt: string;
  mergedAt?: string;
}

export interface FinOpsSignal {
  id: string;
  kind: "infinite-loop" | "unprotected-route" | "unthrottled-provider";
  severity: Severity;
  title: string;
  path: string;
  line?: number;
  provider?: AiProvider;
  confirmedRuntime: boolean; // static-potential vs. confirmed runtime loop
  description: string;
}

export interface LoopGraphNode {
  id: string;
  label: string;
  kind: "render" | "effect" | "state" | "api" | "db" | "deps";
  findingId?: string;
}
export interface LoopGraph {
  nodes: LoopGraphNode[];
  edges: { from: string; to: string; risk?: boolean }[];
}

export interface RateLimitConfig {
  id: string;
  enabled: boolean;
  requestsPerMinute: number;
  strategy: "token-bucket" | "fixed-window" | "sliding-window";
  scope: "ip" | "user" | "ip+user";
  backend: "upstash-redis" | "memory";
  dailySpendKillSwitch: {
    enabled: boolean;
    thresholdUsd: number;
    confirmedByBackend: boolean;
  };
}

export interface DatabasePolicy {
  id: string;
  name: string;
  command: "SELECT" | "INSERT" | "UPDATE" | "DELETE" | "ALL";
  roles: string[];
  using?: string;
  withCheck?: string;
  permissive: boolean; // e.g. USING(true)
}

export interface DatabaseTable {
  id: string;
  schema: string;
  name: string;
  rlsEnabled: boolean;
  policies: DatabasePolicy[];
  relations: { to: string; column: string }[];
  rowEstimate?: number;
  inspection: "inspected" | "not-inspected" | "error";
  findingIds: string[];
  lastInspectedAt?: string;
}

export interface StripeEndpoint {
  id: string;
  path: string;
  verifiesSignature: boolean;
  idempotent: boolean;
  handledEvents: string[];
  handlesCancellation: boolean;
  handlesDowngrade: boolean;
  syncsDatabase: boolean;
  findingIds: string[];
}

export interface SmokeTestStep {
  id: string;
  name: string;
  status: SmokeStatus;
  durationMs?: number;
  screenshotUrl?: string;
  consoleErrors?: string[];
  assertionsFailed?: string[];
  stackTrace?: string;
}

export interface SmokeTestRun {
  id: string;
  deploymentUrl?: string;
  status: SmokeStatus;
  startedAt?: string;
  durationMs?: number;
  steps: SmokeTestStep[];
  videoUrl?: string;
  origin: DataOrigin;
}

export interface ContextFile {
  id: string;
  name: ".cursorrules" | ".windsurfrules" | "CLAUDE.md";
  exists: boolean;
  syncStatus: "synced" | "update-available" | "missing" | "conflict";
  currentVersion?: string;
  previousVersion?: string;
  proposedDiff?: string;
  lastCommitAt?: string;
}

export interface ContextAnalysis {
  deadDependencies: number;
  duplicateComponents: number;
  filesOver2000Lines: number;
  missingSecurityRules: number;
}

export interface MCPConnection {
  id: string;
  client: McpClient;
  status: ConnectionStatus;
  serverVersion?: string;
  lastHeartbeatAt?: string;
  lastValidationAt?: string;
  capabilities: string[];
  recentEvents: { at: string; message: string; blocked?: boolean }[];
}

export interface LegalDocState {
  detectedApis: string[];
  privacyPolicy: "none" | "draft" | "generated";
  termsOfService: "none" | "draft" | "generated";
  gdprDeleteEndpoint: "none" | "draft" | "generated";
}

export interface VerificationBadge {
  state: "unverified" | "verified" | "expired" | "revoked";
  score?: number;
  publicUrl?: string;
  embedCode?: string;
  verifiedAt?: string;
  expiresAt?: string;
}

// ---- Dashboard composition ---------------------------------------------------

export interface PillarSummary {
  pillar: Pillar;
  score: number;
  status: "healthy" | "attention" | "critical" | "not-scanned";
  openFindings: number;
}

export interface ReadinessState {
  score: number;
  previousScore?: number;
  potentialGain: number;
  lastScanAt?: string;
  origin: DataOrigin;
  history: { at: string; score: number }[];
  pillars: PillarSummary[];
}

/** Generic envelope for any data region, carrying honest state. */
export interface DataEnvelope<T> {
  origin: DataOrigin;
  data: T;
  lastUpdatedAt?: string;
  note?: string;
}
