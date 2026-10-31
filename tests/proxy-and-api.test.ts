import { describe, it, expect, afterEach, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const CONFIGURED = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
};

async function loadProxy(env: Record<string, string>, userId: string | null = null) {
  vi.resetModules();
  for (const k of ["VIBESHIELD_ENV", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]) vi.stubEnv(k, "");
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  vi.doMock("@/lib/supabase/proxy", () => ({
    updateSession: async () => {
      const response = NextResponse.next();
      response.cookies.set("sb-test-auth-token", "refreshed");
      return { response, userId };
    },
  }));
  return (await import("@/proxy")).proxy;
}

const req = (path: string) => new NextRequest(new URL(path, "http://localhost:3000"));
const location = (r: Response) => r.headers.get("location");

afterEach(() => {
  vi.unstubAllEnvs();
  vi.doUnmock("@/lib/supabase/proxy");
  vi.doUnmock("@/lib/auth/session");
});

describe("proxy", () => {
  it("sends a signed-out visitor to /login and remembers where they were going", async () => {
    const proxy = await loadProxy(CONFIGURED, null);
    const r = await proxy(req("/scans?status=all"));
    expect(r.status).toBe(307);
    expect(location(r)).toBe("http://localhost:3000/login?next=%2Fscans%3Fstatus%3Dall");
    expect(r.headers.get("cache-control")).toContain("no-store");
    expect(r.headers.get("set-cookie")).toContain("sb-test-auth-token=refreshed");
  });

  it("lets a signed-in user through", async () => {
    const proxy = await loadProxy(CONFIGURED, "u1");
    const r = await proxy(req("/overview"));
    expect(location(r)).toBeNull();
  });

  it("never blocks public pages", async () => {
    const proxy = await loadProxy(CONFIGURED, null);
    for (const p of ["/", "/pricing", "/login", "/auth/confirm"]) expect(location(await proxy(req(p)))).toBeNull();
  });

  it("fails closed in production when auth is not configured", async () => {
    const proxy = await loadProxy({ VIBESHIELD_ENV: "production" });
    expect(location(await proxy(req("/overview")))).toBe("http://localhost:3000/login");
    expect(location(await proxy(req("/pricing")))).toBeNull();
  });

  it("allows the labelled demo session in development without auth", async () => {
    const proxy = await loadProxy({ VIBESHIELD_ENV: "development" });
    expect(location(await proxy(req("/overview")))).toBeNull();
  });
});

describe("API routes require a session before doing anything", () => {
  async function loadRoutes() {
    vi.resetModules();
    vi.doMock("@/lib/auth/session", () => ({
      requireApiUser: async () =>
        Response.json({ ok: false, code: "unauthorized", message: "Sign in" }, { status: 401 }),
    }));
    return {
      scan: await import("@/app/api/scan/route"),
      stream: await import("@/app/api/scan/stream/route"),
      pr: await import("@/app/api/fix/pr/route"),
      rate: await import("@/app/api/finops/rate-limit/route"),
      kill: await import("@/app/api/finops/kill-switch/route"),
      stripe: await import("@/app/api/stripe/test/route"),
      smoke: await import("@/app/api/smoke/route"),
      context: await import("@/app/api/context/sync/route"),
    };
  }

  it("returns 401 for every route, even with an invalid body", async () => {
    const r = await loadRoutes();
    const post = () => new Request("http://localhost/api", { method: "POST", body: "not json" });
    const responses = await Promise.all([
      r.scan.POST(post()),
      r.stream.GET(new Request("http://localhost/api/scan/stream")),
      r.pr.POST(post()),
      r.rate.POST(post()),
      r.kill.POST(post()),
      r.stripe.POST(post()),
      r.smoke.POST(post()),
      r.context.POST(post()),
    ]);
    for (const res of responses) expect(res.status).toBe(401);
  });
});
