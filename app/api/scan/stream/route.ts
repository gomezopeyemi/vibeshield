import { sampleSource, githubSource } from "@/lib/source";
import { runScan } from "@/lib/scanner";
import { saveScan } from "@/lib/scan-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Server-Sent Events: runs a REAL scan and streams REAL events as they happen.
 * target=sample scans the bundled vulnerable app (works everywhere).
 * target=github requires a reachable, connected repository. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const target = url.searchParams.get("target") ?? "sample";
  const repo = url.searchParams.get("repo") ?? "";
  const branch = url.searchParams.get("branch") ?? "main";

  const source =
    target === "github" && repo ? githubSource(repo, branch) : sampleSource();

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        } catch {
          /* client disconnected */
        }
      };
      try {
        const result = await runScan(source, (e) => send({ type: "event", event: e }), {
          pace: true,
        });
        const store = result.status === "completed" ? await saveScan(result) : null;
        send({
          type: "result",
          result: {
            scanId: result.scanId,
            status: result.status,
            score: result.score,
            findingCount: result.findings.length,
            fileCount: result.fileCount,
            durationMs: result.durationMs,
            source: result.source,
            error: result.error,
            persisted: store?.persisted ?? false,
          },
        });
      } catch (err) {
        send({ type: "error", message: err instanceof Error ? err.message : "scan failed" });
      } finally {
        send({ type: "done" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
