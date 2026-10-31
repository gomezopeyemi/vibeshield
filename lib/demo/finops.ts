import type {
  FinOpsSignal,
  LoopGraph,
  RateLimitConfig,
  AiProvider,
} from "@/lib/types";

/* ⚠️ DEMO DATA — FinOps / denial-of-wallet fixtures. Static-analysis signals are
 * real-shaped; provider spend telemetry is intentionally "not connected". */

export const DEMO_RATE_LIMIT: RateLimitConfig = {
  id: "rl_default",
  enabled: true,
  requestsPerMinute: 10,
  strategy: "token-bucket",
  scope: "ip+user",
  backend: "upstash-redis",
  dailySpendKillSwitch: {
    enabled: false,
    thresholdUsd: 50,
    confirmedByBackend: false,
  },
};

export const DEMO_FINOPS_SIGNALS: FinOpsSignal[] = [
  {
    id: "sig_loop",
    kind: "infinite-loop",
    severity: "medium",
    title: "Effect depends on state it sets",
    path: "src/components/UsageDashboard.tsx",
    line: 20,
    confirmedRuntime: false,
    description:
      "useEffect includes `data` in its dependency array and calls setData inside — a static potential loop.",
  },
  {
    id: "sig_route_ai",
    kind: "unprotected-route",
    severity: "high",
    title: "/api/ai/generate — no auth, no rate limit",
    path: "src/app/api/ai/generate/route.ts",
    line: 4,
    provider: "openai",
    confirmedRuntime: false,
    description: "Paid OpenAI call reachable without authentication or throttling.",
  },
  {
    id: "sig_route_voice",
    kind: "unprotected-route",
    severity: "medium",
    title: "/api/voice — no rate limit",
    path: "src/app/api/voice/route.ts",
    line: 7,
    provider: "elevenlabs",
    confirmedRuntime: false,
    description: "ElevenLabs synthesis route is authenticated but not rate-limited.",
  },
  {
    id: "sig_route_img",
    kind: "unprotected-route",
    severity: "medium",
    title: "/api/image — no rate limit",
    path: "src/app/api/image/route.ts",
    line: 5,
    provider: "replicate",
    confirmedRuntime: false,
    description: "Replicate image generation route lacks a rate limiter.",
  },
];

export const DEMO_LOOP_GRAPH: LoopGraph = {
  nodes: [
    { id: "render", label: "Component render", kind: "render" },
    { id: "effect", label: "useEffect", kind: "effect", findingId: "find_loop" },
    { id: "api", label: "fetchUsage()", kind: "api" },
    { id: "state", label: "setData()", kind: "state" },
    { id: "deps", label: "[data]", kind: "deps", findingId: "find_loop" },
  ],
  edges: [
    { from: "render", to: "effect" },
    { from: "effect", to: "api" },
    { from: "api", to: "state" },
    { from: "state", to: "deps", risk: true },
    { from: "deps", to: "render", risk: true },
  ],
};

export interface ProviderUsage {
  provider: AiProvider;
  connected: boolean;
  requests?: number;
  spendUsd?: number;
}

/* Honest: provider spend telemetry is not connected in this build. */
export const DEMO_PROVIDER_USAGE: ProviderUsage[] = [
  { provider: "openai", connected: false },
  { provider: "anthropic", connected: false },
  { provider: "elevenlabs", connected: false },
  { provider: "replicate", connected: false },
  { provider: "resend", connected: false },
];
