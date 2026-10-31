import { describe, it, expect, afterEach, vi } from "vitest";

type FakeUser = { id: string; email: string; email_confirmed_at: string | null; user_metadata: Record<string, unknown> };

const CONFIGURED = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
};

async function load(env: Record<string, string>, user?: FakeUser | null) {
  vi.resetModules();
  for (const k of ["VIBESHIELD_ENV", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]) vi.stubEnv(k, "");
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  vi.doMock("next/server", async (importOriginal) => ({
    ...(await importOriginal<typeof import("next/server")>()),
    connection: async () => {},
  }));
  vi.doMock("@/lib/supabase/server", () => ({
    createClient: async () => ({
      auth: {
        getUser: async () =>
          user ? { data: { user }, error: null } : { data: { user: null }, error: { message: "no session" } },
      },
    }),
  }));
  return import("@/lib/auth/session");
}

/** Next's redirect() throws; its digest is "NEXT_REDIRECT;<type>;<url>;<status>;". */
async function redirectTarget(fn: () => Promise<unknown>): Promise<string | null> {
  try {
    await fn();
    return null;
  } catch (e) {
    const digest = (e as { digest?: string }).digest ?? "";
    return digest.split(";")[2] ?? digest;
  }
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.doUnmock("@/lib/supabase/server");
  vi.doUnmock("next/server");
});

describe("authMode", () => {
  it("is supabase when the public URL and key are set", async () => {
    expect((await load({ ...CONFIGURED, VIBESHIELD_ENV: "production" })).authMode()).toBe("supabase");
  });

  it("falls back to a demo session only where fixtures are allowed", async () => {
    expect((await load({ VIBESHIELD_ENV: "development" })).authMode()).toBe("demo");
    expect((await load({ VIBESHIELD_ENV: "production" })).authMode()).toBe("unconfigured");
  });

  it("refuses a secret key placed in a public variable", async () => {
    const s = await load({
      NEXT_PUBLIC_SUPABASE_URL: CONFIGURED.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_secret_x",
      VIBESHIELD_ENV: "production",
    });
    expect(s.authMode()).toBe("unconfigured");
  });
});

describe("getSession / requireUser", () => {
  const verified: FakeUser = {
    id: "u1",
    email: "ada@example.test",
    email_confirmed_at: "2026-10-01T00:00:00Z",
    user_metadata: { full_name: "Ada Lovelace" },
  };

  it("returns a verified user with only safe fields", async () => {
    const s = await load(CONFIGURED, verified);
    expect(await s.getSession()).toEqual({
      state: "signed-in",
      user: { id: "u1", email: "ada@example.test", name: "Ada Lovelace", demo: false },
    });
  });

  it("treats an unconfirmed email as unverified and redirects to /verify-email", async () => {
    const s = await load(CONFIGURED, { ...verified, email_confirmed_at: null });
    expect(await s.getSession()).toEqual({ state: "unverified", email: "ada@example.test" });
    expect(await redirectTarget(() => s.requireUser())).toBe("/verify-email");
  });

  it("redirects a signed-out visitor to /login", async () => {
    const s = await load(CONFIGURED, null);
    expect(await redirectTarget(() => s.requireUser())).toBe("/login");
  });

  it("fails closed when auth is unconfigured outside demo environments", async () => {
    const s = await load({ VIBESHIELD_ENV: "production" });
    expect(await redirectTarget(() => s.requireUser())).toBe("/login");
  });

  it("uses the labelled demo identity in development without auth", async () => {
    const s = await load({ VIBESHIELD_ENV: "development" });
    expect((await s.requireUser()).demo).toBe(true);
  });
});

describe("requireApiUser", () => {
  it("returns 401 JSON when signed out", async () => {
    const s = await load(CONFIGURED, null);
    const r = await s.requireApiUser();
    expect(r).toBeInstanceOf(Response);
    expect((r as Response).status).toBe(401);
    expect(await (r as Response).json()).toMatchObject({ ok: false, code: "unauthorized" });
  });

  it("returns 503 auth_not_configured when auth is missing in production", async () => {
    const s = await load({ VIBESHIELD_ENV: "production" });
    const r = (await s.requireApiUser()) as Response;
    expect(r.status).toBe(503);
    expect((await r.json()).code).toBe("auth_not_configured");
  });

  it("returns the user when signed in", async () => {
    const s = await load(CONFIGURED, {
      id: "u1",
      email: "ada@example.test",
      email_confirmed_at: "2026-10-01T00:00:00Z",
      user_metadata: {},
    });
    expect(await s.requireApiUser()).toMatchObject({ id: "u1", name: "ada" });
  });
});
