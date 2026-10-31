import { z } from "zod";
import { parse, notImplemented, requireIntegration } from "@/lib/api";

const schema = z.object({
  deploymentUrl: z.string().url().optional(),
});

export async function POST(req: Request) {
  const parsed = await parse(req, schema);
  if ("error" in parsed) return parsed.error;

  const gate = requireIntegration("vercel", {
    message:
      "Smoke tests run headless Playwright on isolated workers against a preview deployment — not connected.",
    remediation:
      "Connect Vercel for preview URLs and enable Playwright workers on the Pro plan.",
  });
  if (gate) return gate;

  // TODO(live): launch a Playwright run on an ephemeral worker and stream steps,
  // screenshots and video artifacts back via Realtime.
  return notImplemented("Smoke test runs are not built yet.");
}
