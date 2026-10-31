import { z } from "zod";
import { parse, ok, requireIntegration } from "@/lib/api";

const schema = z.object({
  event: z.string().min(1), // e.g. checkout.session.completed
});

export async function POST(req: Request) {
  const parsed = await parse(req, schema);
  if ("error" in parsed) return parsed.error;

  const gate = requireIntegration("stripe", {
    message:
      "Webhook simulation uses a sandboxed Stripe test clock and your endpoint — Stripe is not connected.",
    remediation:
      "Connect Stripe (restricted key) so tests run against a sandbox and never touch live payment records.",
  });
  if (gate) return gate;

  // TODO(live): dispatch a signed test event to the configured endpoint in a
  // sandbox and return signature/processing/db-sync results. Never writes to
  // real customer payment records.
  return ok({ dispatched: false });
}
