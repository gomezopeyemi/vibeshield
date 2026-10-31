import { describe, it, expect, afterEach, vi } from "vitest";
import { IDLE } from "@/lib/auth/schemas";

type Fn = (...args: unknown[]) => Promise<unknown>;
type AuthMock = Partial<Record<"signInWithPassword" | "signUp" | "resetPasswordForEmail" | "resend" | "updateUser" | "getUser", Fn>>;

const fetchDown = { name: "AuthRetryableFetchError", status: 0, code: undefined, message: "fetch failed" };

async function load(auth: AuthMock, env: Record<string, string> = {}) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.vibeshield.test");
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  vi.doMock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), connection: async () => {} }));
  vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth }) }));
  return import("@/lib/auth/actions");
}

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};

async function redirectTarget(p: Promise<unknown>): Promise<string | null> {
  try {
    await p;
    return null;
  } catch (e) {
    return ((e as { digest?: string }).digest ?? "").split(";")[2] ?? null;
  }
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.doUnmock("@/lib/supabase/server");
  vi.doUnmock("next/server");
});

describe("signIn", () => {
  const creds = { email: "Ada@Example.test", password: "correct-horse" };

  it("redirects to a safe `next` after success, ignoring off-site targets", async () => {
    const a = await load({ signInWithPassword: async () => ({ error: null }) });
    expect(await redirectTarget(a.signIn(IDLE, form({ ...creds, next: "/scans?x=1" })))).toBe("/scans?x=1");
    expect(await redirectTarget(a.signIn(IDLE, form({ ...creds, next: "https://evil.test" })))).toBe("/overview");
  });

  it("normalises the email before calling Supabase", async () => {
    const spy = vi.fn(async () => ({ error: null }));
    const a = await load({ signInWithPassword: spy });
    await redirectTarget(a.signIn(IDLE, form(creds)));
    expect(spy).toHaveBeenCalledWith({ email: "ada@example.test", password: "correct-horse" });
  });

  it("uses one generic message for bad credentials", async () => {
    const a = await load({ signInWithPassword: async () => ({ error: { name: "AuthApiError", status: 400, code: "invalid_credentials", message: "x" } }) });
    const s = await a.signIn(IDLE, form(creds));
    expect(s).toMatchObject({ status: "error", message: "Invalid email or password.", values: { email: "Ada@Example.test" } });
    expect(JSON.stringify(s)).not.toContain("correct-horse");
  });

  it("reports an outage as an outage, not as bad credentials", async () => {
    const a = await load({ signInWithPassword: async () => ({ error: fetchDown }) });
    const s = await a.signIn(IDLE, form(creds));
    expect(s.message).toMatch(/can't reach the sign-in service/i);
  });

  it("offers a resend when the email is not verified", async () => {
    const a = await load({ signInWithPassword: async () => ({ error: { name: "AuthApiError", status: 400, code: "email_not_confirmed", message: "x" } }) });
    expect(await a.signIn(IDLE, form(creds))).toMatchObject({ unverifiedEmail: "ada@example.test" });
  });

  it("returns field errors without calling Supabase for invalid input", async () => {
    const spy = vi.fn();
    const a = await load({ signInWithPassword: spy as unknown as Fn });
    const s = await a.signIn(IDLE, form({ email: "nope", password: "" }));
    expect(s.fieldErrors?.email?.length).toBeGreaterThan(0);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("signUp", () => {
  const input = { name: "Ada", email: "ada@example.test", password: "correct-horse" };

  it("sends the verification link to /auth/confirm on the configured site and redirects to /verify-email", async () => {
    const spy = vi.fn(async () => ({ error: null }));
    const a = await load({ signUp: spy });
    expect(await redirectTarget(a.signUp(IDLE, form(input)))).toBe("/verify-email");
    expect(spy).toHaveBeenCalledWith({
      email: "ada@example.test",
      password: "correct-horse",
      options: { data: { full_name: "Ada" }, emailRedirectTo: "https://app.vibeshield.test/auth/confirm?next=/overview" },
    });
  });

  it("refuses to send email links in production without NEXT_PUBLIC_SITE_URL", async () => {
    const spy = vi.fn();
    const a = await load({ signUp: spy as unknown as Fn }, { NEXT_PUBLIC_SITE_URL: "", VIBESHIELD_ENV: "production" });
    expect((await a.signUp(IDLE, form(input))).message).toMatch(/NEXT_PUBLIC_SITE_URL/);
    expect(spy).not.toHaveBeenCalled();
  });

  it("reports rate limiting", async () => {
    const a = await load({ signUp: async () => ({ error: { name: "AuthApiError", status: 429, code: "over_email_send_rate_limit", message: "x" } }) });
    expect((await a.signUp(IDLE, form(input))).message).toMatch(/too many attempts/i);
  });
});

describe("account-enumeration resistance", () => {
  it("gives the same reset answer whether or not the account exists", async () => {
    const exists = await (await load({ resetPasswordForEmail: async () => ({ error: null }) })).requestPasswordReset(IDLE, form({ email: "a@b.co" }));
    const missing = await (await load({ resetPasswordForEmail: async () => ({ error: { name: "AuthApiError", status: 400, code: "user_not_found", message: "x" } }) })).requestPasswordReset(IDLE, form({ email: "a@b.co" }));
    expect(exists).toEqual(missing);
    expect(exists.status).toBe("success");
  });

  it("points reset links at /reset-password via /auth/confirm", async () => {
    const spy = vi.fn(async () => ({ error: null }));
    await (await load({ resetPasswordForEmail: spy })).requestPasswordReset(IDLE, form({ email: "a@b.co" }));
    expect(spy).toHaveBeenCalledWith("a@b.co", { redirectTo: "https://app.vibeshield.test/auth/confirm?next=/reset-password" });
  });
});

describe("updatePassword", () => {
  const verified = { id: "u1", email: "a@b.co", email_confirmed_at: "2026-01-01", user_metadata: {} };

  it("refuses without a session", async () => {
    const spy = vi.fn();
    const a = await load({ getUser: async () => ({ data: { user: null }, error: { message: "none" } }), updateUser: spy as unknown as Fn });
    expect((await a.updatePassword(IDLE, form({ password: "new-password-1", confirm: "new-password-1" }))).message).toMatch(/expired/);
    expect(spy).not.toHaveBeenCalled();
  });

  it("updates and redirects for a signed-in user", async () => {
    const spy = vi.fn(async () => ({ error: null }));
    const a = await load({ getUser: async () => ({ data: { user: verified }, error: null }), updateUser: spy });
    expect(await redirectTarget(a.updatePassword(IDLE, form({ password: "new-password-1", confirm: "new-password-1" })))).toBe("/overview");
    expect(spy).toHaveBeenCalledWith({ password: "new-password-1" });
  });
});
