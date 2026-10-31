import { describe, it, expect } from "vitest";
import { runScan, score } from "@/lib/scanner";
import { sampleSource, type RepoSource } from "@/lib/source";
import type { Finding, Severity } from "@/lib/types";

const finding = (pillar: Finding["pillar"], severity: Severity, id = `${pillar}-${severity}`): Finding => ({
  id,
  pillar,
  severity,
  status: "open",
  title: "t",
  humanSummary: "",
  businessImpact: "",
  scanner: "static-rules",
  evidence: "",
  recommendation: "",
  detectedAt: new Date().toISOString(),
});

describe("scanner on the bundled sample app", () => {
  it("completes and reports only the engine that actually ran", async () => {
    const r = await runScan(sampleSource(), () => {}, { pace: false });
    expect(r.status).toBe("completed");
    expect(r.scanners).toEqual(["static-rules"]);
    expect(r.events.every((e) => e.scanner === "static-rules")).toBe(true);
    expect(r.fileCount).toBeGreaterThan(0);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it("makes no claim about history scans or database inspection", async () => {
    const r = await runScan(sampleSource(), () => {}, { pace: false });
    const text = r.events.map((e) => e.message).join("\n").toLowerCase();
    for (const claim of ["full history", "pg_policies", "pg_tables", "gitleaks", "semgrep", "tree-sitter", "live probe"]) {
      expect(text).not.toContain(claim);
    }
    for (const f of r.findings) expect(f.evidence).not.toMatch(/^(gitleaks|semgrep|tree-sitter|pg_)/);
  });

  it("detects the planted vulnerabilities", async () => {
    const r = await runScan(sampleSource(), () => {}, { pace: false });
    const titles = r.findings.map((f) => f.title.toLowerCase()).join("\n");
    expect(titles).toContain("service role");
    expect(titles).toContain("stripe webhook");
    expect(r.findings.some((f) => f.severity === "critical")).toBe(true);
  });

  it("redacts secrets in every snippet", async () => {
    const r = await runScan(sampleSource(), () => {}, { pace: false });
    for (const f of r.findings) {
      const text = `${f.context?.snippet ?? ""}\n${f.context?.proposed ?? ""}`;
      expect(text).not.toMatch(/sk_live_[A-Za-z0-9]{8,}/);
      expect(text).not.toMatch(/AKIA[0-9A-Z]{16}/);
    }
  });

  it("gives concurrent scans distinct ids and independent event sequences", async () => {
    const runs = await Promise.all(Array.from({ length: 5 }, () => runScan(sampleSource(), () => {}, { pace: false })));
    expect(new Set(runs.map((r) => r.scanId)).size).toBe(5);
    for (const r of runs) {
      const ids = r.events.map((e) => e.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids).toEqual(ids.map((_, i) => `${r.scanId}_${i}`));
    }
  });

  it("reports a failed source as failed, never as a clean scan", async () => {
    const broken: RepoSource = {
      info: { id: "x", label: "x/y", kind: "github", branch: "main" },
      load: async () => {
        throw new Error("not reachable");
      },
    };
    const r = await runScan(broken, () => {}, { pace: false });
    expect(r.status).toBe("failed");
    expect(r.error).toBe("not reachable");
    expect(r.score).toBe(0);
    expect(r.scanners).toEqual([]);
  });
});

describe("score()", () => {
  it("scores a finding-free source at 100 on every pillar", () => {
    const s = score([]);
    expect(s.score).toBe(100);
    expect(Object.values(s.pillars).every((p) => p === 100)).toBe(true);
  });

  it("lowers only the affected pillar and the weighted overall", () => {
    const s = score([finding("security", "critical")]);
    expect(s.pillars.security).toBe(80);
    expect(s.pillars.finops).toBe(100);
    expect(s.score).toBe(93); // 100 - 20 * 0.35
  });

  it("never drops a pillar below the floor of 15", () => {
    const many = Array.from({ length: 20 }, (_, i) => finding("security", "critical", `c${i}`));
    expect(score(many).pillars.security).toBe(15);
  });

  it("weights severities in order", () => {
    const sev: Severity[] = ["critical", "high", "medium", "low"];
    const scores = sev.map((s) => score([finding("security", s)]).score);
    expect(scores).toEqual([...scores].sort((a, b) => a - b));
  });
});
