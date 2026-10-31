import { z } from "zod";
import { parse, notImplemented, requireIntegration } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/session";

const schema = z.object({
  findingId: z.string().min(1),
});

export async function POST(req: Request) {
  const user = await requireApiUser();
  if (user instanceof Response) return user;
  const parsed = await parse(req, schema);
  if ("error" in parsed) return parsed.error;

  const gate = requireIntegration("github", {
    message: "Opening a remediation Pull Request requires the VibeShield GitHub App with write access.",
    remediation: "Install the GitHub App and grant the repository write scope on the Integrations page.",
  });
  if (gate) return gate;

  // TODO(live): generate patch via Claude API, validate it, create a branch and
  // open a PR via Octokit, then return { number, url, state }.
  return notImplemented("Remediation PR creation is not built yet.");
}
