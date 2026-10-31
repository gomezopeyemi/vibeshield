import { z } from "zod";
import { parse, ok, fail } from "@/lib/api";
import { sampleSource, githubSource } from "@/lib/source";
import { runScan } from "@/lib/scanner";
import { saveScan } from "@/lib/scan-store";
import { requireApiUser } from "@/lib/auth/session";

export const runtime = "nodejs";

const schema = z.object({
  repositoryId: z.string().optional(),
  target: z.enum(["sample", "github"]).optional(),
  repo: z.string().optional(),
  branch: z.string().optional(),
  liveUrl: z.string().url().optional(),
});

/* Non-streaming scan: runs the REAL scanner and persists results.
 * The sample target works anywhere; the GitHub target needs a reachable repo
 * (blocked in this sandbox) and fails honestly. */
export async function POST(req: Request) {
  const user = await requireApiUser();
  if (user instanceof Response) return user;
  const parsed = await parse(req, schema);
  if ("error" in parsed) return parsed.error;
  const { target = "sample", repo, branch = "main" } = parsed.data;

  const source = target === "github" && repo ? githubSource(repo, branch) : sampleSource();

  const result = await runScan(source, () => {}, { pace: false });

  if (result.status !== "completed") {
    return fail({
      code: "not_connected",
      integration: "github",
      message: result.error ?? "Scan could not complete.",
      remediation: "Connect the GitHub App (and attach the repository in restricted environments) to scan a real repository.",
    });
  }

  const store = await saveScan(result, user.id);
  return ok({ persisted: store.persisted, storage: store.mode,
    scanId: result.scanId,
    score: result.score,
    findingCount: result.findings.length,
    fileCount: result.fileCount,
    durationMs: result.durationMs,
    target,
    label: result.source.label,
  });
}
