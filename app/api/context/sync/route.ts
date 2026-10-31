import { z } from "zod";
import { parse, ok, requireIntegration } from "@/lib/api";

const schema = z.object({
  file: z.enum([".cursorrules", ".windsurfrules", "CLAUDE.md"]),
});

export async function POST(req: Request) {
  const parsed = await parse(req, schema);
  if ("error" in parsed) return parsed.error;

  const gate = requireIntegration("github", {
    message: "Syncing AI context files commits to your repository via the GitHub App — not connected.",
    remediation: "Connect the GitHub App to open a sync PR for your rules files.",
  });
  if (gate) return gate;

  // TODO(live): generate the rules content from repo structure + security rules
  // and open a PR updating the selected file.
  return ok({ synced: false, file: parsed.data.file });
}
