import { z } from "zod";
import { parse, notImplemented, requireIntegration } from "@/lib/api";

const schema = z.object({
  enabled: z.boolean(),
  requestsPerMinute: z.number().int().min(1).max(10000),
  strategy: z.enum(["token-bucket", "fixed-window", "sliding-window"]),
  scope: z.enum(["ip", "user", "ip+user"]),
});

export async function POST(req: Request) {
  const parsed = await parse(req, schema);
  if ("error" in parsed) return parsed.error;

  const gate = requireIntegration("upstash", {
    message:
      "Deploying rate-limit middleware requires the Pro backend and an Upstash Redis connection.",
    remediation: "Connect Upstash Redis and enable the pre-deploy middleware on the Pro plan.",
  });
  if (gate) return gate;

  // TODO(live): persist RateLimitConfig and deploy/update the middleware.
  return notImplemented("Rate-limit configuration is not built yet.");
}
