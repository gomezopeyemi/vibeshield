import { z } from "zod";
import { parse, notImplemented, requireIntegration } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/session";

const schema = z.object({
  file: z.enum([".cursorrules", ".windsurfrules", "CLAUDE.md"]),
});

export async function POST(req: Request) {
  const user = await requireApiUser();
  if (user instanceof Response) return user;
  const parsed = await parse(req, schema);
  if ("error" in parsed) return parsed.error;

  const gate = requireIntegration("github", {
    message: "Syncing AI context files commits to your repository via the GitHub App — not connected.",
    remediation: "Connect the GitHub App to open a sync PR for your rules files.",
  });
  if (gate) return gate;

  // TODO(live): generate the rules content from repo structure + security rules
  // and open a PR updating the selected file.
  return notImplemented("Context file sync is not built yet.");
}
