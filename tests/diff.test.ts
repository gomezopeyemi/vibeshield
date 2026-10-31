import { describe, it, expect } from "vitest";
import { diffScans } from "@/lib/scan-store";
import type { ScanResult } from "@/lib/scanner";
import type { Finding } from "@/lib/types";

const f = (id: string): Finding => ({
  id,
  pillar: "security",
  severity: "high",
  status: "open",
  title: id,
  humanSummary: "",
  businessImpact: "",
  scanner: "static-rules",
  evidence: "",
  recommendation: "",
  detectedAt: "2026-01-01T00:00:00.000Z",
});

const run = (scanId: string, ids: string[], score: number): ScanResult => ({
  scanId,
  source: { id: "s", label: "s", kind: "sample", branch: "main" },
  status: "completed",
  startedAt: "2026-01-01T00:00:00.000Z",
  finishedAt: "2026-01-01T00:00:01.000Z",
  durationMs: 1000,
  scanners: ["static-rules"],
  fileCount: 1,
  findings: ids.map(f),
  events: [],
  score,
  pillars: { security: score, finops: 100, revenue: 100, "code-health": 100 },
});

describe("diffScans", () => {
  it("splits findings into introduced, resolved and unchanged", () => {
    const d = diffScans(run("a", ["x", "y"], 70), run("b", ["y", "z"], 85));
    expect(d.introduced.map((x) => x.id)).toEqual(["z"]);
    expect(d.resolved.map((x) => x.id)).toEqual(["x"]);
    expect(d.unchanged.map((x) => x.id)).toEqual(["y"]);
    expect(d.scoreDelta).toBe(15);
    expect(d.pillarDeltas.security).toBe(15);
    expect(d.pillarDeltas.finops).toBe(0);
  });

  it("reports no change for identical scans", () => {
    const d = diffScans(run("a", ["x"], 80), run("b", ["x"], 80));
    expect(d.introduced).toHaveLength(0);
    expect(d.resolved).toHaveLength(0);
    expect(d.scoreDelta).toBe(0);
  });
});
