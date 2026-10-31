import { describe, it, expect, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { IDLE } from "@/lib/auth/schemas";

const CONFIGURED = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  NEXT_PUBLIC_SITE_URL: "https://app.vibeshield.test",
};

function stubEnv(env: Record<string, string>) {
  for (const k of ["VIBESHIELD_ENV", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SITE_URL"]) vi.stubEnv(k, "");
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
}

/** Fakes the Supabase /auth/v1/settings response used for provider detection. */
function stubSettings(body: unknown, ok = true) {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok, json: async () => body }) as unknown as Response));
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.doUnmock("@/lib/supabase/server");
  vi.doUnmock("@/lib/supabase/providers");
  vi.doUnmock("next/server");
});

describe("provider detection", () => {
  async function providers(env: Record<string, string>, settings: unknown, ok = true) {
    vi.resetModules();
    stubEnv(env);
    stubSettings(settings, ok);
    return (await import("@/lib/supabase/providers")).getEnabledProviders();
  }

  it("detects Google when the project has it enabled", async () => {
    expect([...(await providers(CONFIGURED, { external: { google: true, email: true } }))]).toEqual(["google"]);
  });

  it("reports nothing when Google is off", async () => {
    expect((await providers(CONFIGURED, { external: { google: false, email: true } })).size).toBe(0);
  });

  it("fails closed when the settings call errors or auth is unconfigured", async () => {
    expect((await providers(CONFIGURED, {}, false)).size).toBe(0);
    expect((await providers({}, { external: { google: true } })).size).toBe(0);

    vi.resetModules();
    stubEnv(CONFIGURED);
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down"); }));
    expect((await (await import("@/lib/supabase/providers")).getEnabledProviders()).size).toBe(0);
  });
});

describe("signInWithGoogle", () => {
  async function load(googleEnabled: boolean, oauth: { url?: string; error?: unknown } = {}) {
    vi.resetModules();
    stubEnv(CONFIGURED);
    const signInWithOAuth = vi.fn(async (_args: unknown) => ({
      data: oauth.url ? { url: oauth.url } : null,
      error: oauth.error ?? null,
    }));
    vi.doMock("@/lib/supabase/providers", () => ({
      getEnabledProviders: async () => new Set(googleEnabled ? ["google"] : []),
    }));
    vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { signInWithOAuth } }) }));
    return { actions: await import("@/lib/auth/actions"), signInWithOAuth };
  }

  const form = (f: Record<string, string> = {}) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(f)) fd.set(k, v);
    return fd;
  };

  async function redirectTarget(p: Promise<unknown>) {
    try {
      await p;
      return null;
    } catch (e) {
      return ((e as { digest?: string }).digest ?? "").split(";")[2] ?? null;
    }
  }

  it("refuses, without calling Supabase, when the project has Google disabled", async () => {
    const { actions, signInWithOAuth } = await load(false);
    const s = await actions.signInWithGoogle(IDLE, form());
    expect(s).toMatchObject({ status: "error" });
    expect(s.message).toMatch(/isn't enabled/i);
    expect(signInWithOAuth).not.toHaveBeenCalled();
  });

  it("redirects to the provider and points the callback at /auth/confirm", async () => {
    const { actions, signInWithOAuth } = await load(true, { url: "https://accounts.google.com/o/oauth2/auth?x=1" });
    expect(await redirectTarget(actions.signInWithGoogle(IDLE, form({ next: "/scans?status=all" })))).toBe(
      "https://accounts.google.com/o/oauth2/auth?x=1",
    );
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "https://app.vibeshield.test/auth/confirm?next=%2Fscans%3Fstatus%3Dall",
        skipBrowserRedirect: true,
      },
    });
  });

  it("sanitises an off-site `next` before handing it to the provider", async () => {
    const { signInWithOAuth, actions } = await load(true, { url: "https://accounts.google.com/x" });
    await redirectTarget(actions.signInWithGoogle(IDLE, form({ next: "https://evil.test/steal" })));
    const redirectTo = (signInWithOAuth.mock.calls as unknown as [{ options: { redirectTo: string } }][])[0][0]
      .options.redirectTo;
    expect(redirectTo).toBe("https://app.vibeshield.test/auth/confirm?next=%2Foverview");
    expect(redirectTo).not.toContain("evil.test");
  });

  it("reports an honest error when the provider handshake fails", async () => {
    const { actions } = await load(true, { error: { name: "AuthApiError", status: 500, message: "boom" } });
    expect((await actions.signInWithGoogle(IDLE, form())).message).toMatch(/couldn't start Google sign-in/i);
  });
});

describe("/auth/confirm", () => {
  async function load(exchangeOk = true) {
    vi.resetModules();
    stubEnv(CONFIGURED);
    const exchangeCodeForSession = vi.fn(async () => ({ error: exchangeOk ? null : { message: "bad code" } }));
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: async () => ({ auth: { exchangeCodeForSession, verifyOtp: async () => ({ error: null }) } }),
    }));
    return { GET: (await import("@/app/auth/confirm/route")).GET, exchangeCodeForSession };
  }

  const req = (qs: string) => new NextRequest(new URL(`/auth/confirm${qs}`, "http://localhost:3000"));

  it("exchanges an OAuth code and lands on the requested page", async () => {
    const { GET, exchangeCodeForSession } = await load();
    const r = await GET(req("?code=abc123&next=%2Fscans"));
    expect(r.headers.get("location")).toBe("http://localhost:3000/scans");
    expect(exchangeCodeForSession).toHaveBeenCalledWith("abc123");
    expect(r.headers.get("cache-control")).toContain("no-store");
  });

  it("treats a cancelled Google sign-in as cancelled, not as a broken link", async () => {
    const { GET, exchangeCodeForSession } = await load();
    const r = await GET(req("?error=access_denied&error_description=denied"));
    expect(r.headers.get("location")).toBe("http://localhost:3000/login?error=oauth_cancelled");
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("reports other provider failures distinctly", async () => {
    const { GET } = await load();
    const r = await GET(req("?error=server_error"));
    expect(r.headers.get("location")).toBe("http://localhost:3000/login?error=oauth_failed");
  });

  it("refuses to forward an off-site `next` after a valid exchange", async () => {
    const { GET } = await load();
    const r = await GET(req("?code=abc&next=https%3A%2F%2Fevil.test"));
    expect(r.headers.get("location")).toBe("http://localhost:3000/overview");
  });

  it("sends a failed exchange back to login", async () => {
    const { GET } = await load(false);
    const r = await GET(req("?code=stale"));
    expect(r.headers.get("location")).toBe("http://localhost:3000/login?error=link_invalid");
  });
});
