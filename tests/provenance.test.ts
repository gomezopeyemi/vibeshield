import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

type G = typeof globalThis & { __vibeshield_runs?: unknown[] };

async function load(env: Record<string, string | undefined>) {
  vi.resetModules();
  (globalThis as G).__vibeshield_runs = [];
  for (const k of ["VIBESHIELD_ENV", "VIBESHIELD_LIVE", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) vi.stubEnv(k, "");
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v ?? "");
  const config = await import("@/lib/config");
  const data = await import("@/lib/data");
  const store = await import("@/lib/scan-store");
  const scanner = await import("@/lib/scanner");
  const source = await import("@/lib/source");
  return { config, data, store, scanner, source };
}

beforeEach(() => vi.unstubAllEnvs());
afterEach(() => {
  vi.unstubAllEnvs();
  delete (globalThis as G).__vibeshield_runs;
});

describe("APP_ENV", () => {
  it("honours an explicit VIBESHIELD_ENV", async () => {
    for (const env of ["development", "demo", "staging", "production"] as const) {
      const { config } = await load({ VIBESHIELD_ENV: env });
      expect(config.APP_ENV).toBe(env);
    }
  });

  it("allows demo fixtures only in development and demo", async () => {
    expect((await load({ VIBESHIELD_ENV: "development" })).config.DEMO_ALLOWED).toBe(true);
    expect((await load({ VIBESHIELD_ENV: "demo" })).config.DEMO_ALLOWED).toBe(true);
    expect((await load({ VIBESHIELD_ENV: "staging" })).config.DEMO_ALLOWED).toBe(false);
    expect((await load({ VIBESHIELD_ENV: "production" })).config.DEMO_ALLOWED).toBe(false);
  });

  it("labels an unconfigured production build as demo, not production", async () => {
    const { config } = await load({ NODE_ENV: "production" });
    expect(config.APP_ENV).toBe("demo");
  });
});

describe("data layer provenance", () => {
  it("serves labelled demo data in a demo deployment with no scans", async () => {
    const { data } = await load({ VIBESHIELD_ENV: "demo" });
    expect((await data.getReadiness()).origin).toBe("demo");
    expect((await data.getFindings()).origin).toBe("demo");
  });

  it("never serves demo fixtures in production", async () => {
    const { data } = await load({ VIBESHIELD_ENV: "production" });
    const readiness = await data.getReadiness();
    expect(readiness.origin).toBe("unavailable");
    expect(readiness.data.pillars.every((p) => p.status === "not-scanned")).toBe(true);
    expect((await data.getFindings())).toMatchObject({ origin: "unavailable", data: [] });
    expect((await data.getScans())).toMatchObject({ origin: "unavailable", data: [] });
    expect((await data.getPullRequests())).toMatchObject({ origin: "unavailable", data: [] });
    expect((await data.getVerification()).data.state).toBe("unverified");
    expect(await data.getFinding("f_anything")).toBeNull();
  });

  it("does not mix demo PRs or a demo badge with a real scan", async () => {
    const { data, store, scanner, source } = await load({ VIBESHIELD_ENV: "development" });
    const result = await scanner.runScan(source.sampleSource(), () => {}, { pace: false });
    await store.saveScan(result);

    const readiness = await data.getReadiness();
    expect(readiness.origin).toBe("live");
    expect(readiness.data.score).toBe(result.score);
    expect((await data.getFindings()).origin).toBe("live");
    expect((await data.getPullRequests())).toMatchObject({ origin: "unavailable", data: [] });

    const verification = await data.getVerification();
    expect(verification.origin).toBe("unavailable");
    expect(verification.data.state).toBe("unverified");

    const events = await data.getScanEvents(result.scanId);
    expect(events.origin).toBe("live");
    expect(events.data.length).toBe(result.events.length);
  });
});
