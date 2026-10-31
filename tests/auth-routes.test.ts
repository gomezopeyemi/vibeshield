import { describe, it, expect } from "vitest";
import { isProtectedPath, isPublicPath, safeNext } from "@/lib/auth/routes";
import { signInSchema, signUpSchema, resetPasswordSchema, emailOnlySchema } from "@/lib/auth/schemas";
import { keyLooksPrivileged } from "@/lib/supabase/env";

describe("route classification", () => {
  it("treats marketing and auth pages as public", () => {
    for (const p of ["/", "/features", "/pricing", "/terms", "/privacy", "/login", "/signup", "/forgot-password", "/reset-password", "/verify-email", "/auth/confirm"]) {
      expect(isPublicPath(p)).toBe(true);
      expect(isProtectedPath(p)).toBe(false);
    }
  });

  it("protects every app route, and unknown routes by default", () => {
    for (const p of ["/overview", "/scans", "/scans/abc", "/fix", "/settings", "/integrations", "/something-new"]) {
      expect(isProtectedPath(p)).toBe(true);
    }
  });

  it("leaves API routes to their own 401 handling", () => {
    expect(isProtectedPath("/api/scan")).toBe(false);
  });

  it("does not let a public path leak into lookalike paths", () => {
    expect(isPublicPath("/login-admin")).toBe(false);
    expect(isPublicPath("/authx")).toBe(false);
  });
});

describe("safeNext (open-redirect guard)", () => {
  it("keeps same-origin paths with query and hash", () => {
    expect(safeNext("/scans?status=all#top")).toBe("/scans?status=all#top");
  });

  it("rejects absolute, protocol-relative and backslash URLs", () => {
    for (const bad of ["https://evil.test", "//evil.test", "/\\evil.test", "\\\\evil.test", "javascript:alert(1)", "evil.test/x", "", "/" + "a".repeat(600)]) {
      expect(safeNext(bad)).toBe("/overview");
    }
  });

  it("falls back for non-strings", () => {
    expect(safeNext(undefined)).toBe("/overview");
    expect(safeNext(null, "/x")).toBe("/x");
  });
});

describe("auth form schemas", () => {
  it("normalises email and accepts a valid sign-up", () => {
    const r = signUpSchema.safeParse({ name: " Ada ", email: " Ada@Example.COM ", password: "correct-horse" });
    expect(r.success && r.data).toMatchObject({ name: "Ada", email: "ada@example.com" });
  });

  it("enforces password length bounds (bcrypt's 72-byte limit)", () => {
    expect(signUpSchema.safeParse({ name: "a", email: "a@b.co", password: "short" }).success).toBe(false);
    expect(signUpSchema.safeParse({ name: "a", email: "a@b.co", password: "x".repeat(73) }).success).toBe(false);
  });

  it("rejects malformed email and empty password", () => {
    expect(emailOnlySchema.safeParse({ email: "not-an-email" }).success).toBe(false);
    expect(signInSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });

  it("requires matching password confirmation", () => {
    const r = resetPasswordSchema.safeParse({ password: "long-enough-1", confirm: "different-123" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path).toEqual(["confirm"]);
  });
});

describe("privileged key detection", () => {
  const jwt = (payload: object) =>
    ["eyJhbGciOiJIUzI1NiJ9", Buffer.from(JSON.stringify(payload)).toString("base64url"), "sig"].join(".");

  it("flags secret and service_role keys", () => {
    expect(keyLooksPrivileged("sb_secret_abc123")).toBe(true);
    expect(keyLooksPrivileged(jwt({ role: "service_role" }))).toBe(true);
  });

  it("accepts publishable and anon keys", () => {
    expect(keyLooksPrivileged("sb_publishable_abc123")).toBe(false);
    expect(keyLooksPrivileged(jwt({ role: "anon" }))).toBe(false);
    expect(keyLooksPrivileged("garbage")).toBe(false);
  });
});
