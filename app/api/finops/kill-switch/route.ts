import { z } from "zod";
import { parse, notImplemented, requireIntegration } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/session";

const schema = z.object({
  enabled: z.boolean(),
  thresholdUsd: z.number().min(1).max(100000),
});

export async function POST(req: Request) {
  const user = await requireApiUser();
  if (user instanceof Response) return user;
  const parsed = await parse(req, schema);
  if ("error" in parsed) return parsed.error;

  const gate = requireIntegration("upstash", {
    message:
      "The Daily Spend Kill Switch must be armed by the backend spend-guard — it is not connected.",
    remediation:
      "Connect your provider billing + Upstash backend so the kill switch can actually halt spend.",
  });
  if (gate) return gate;

  // TODO(live): arm/disarm the spend guard and return backend confirmation.
  // Until confirmed by the backend, a UI toggle is never treated as "active".
  return notImplemented("The spend kill switch is not built yet.");
}
