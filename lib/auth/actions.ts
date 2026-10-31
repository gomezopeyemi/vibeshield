"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { AuthError } from "@supabase/supabase-js";
import { APP_ENV } from "@/lib/config";
import { AUTH_CONFIGURED } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { getEnabledProviders } from "@/lib/supabase/providers";
import { getSession } from "@/lib/auth/session";
import { safeNext } from "@/lib/auth/routes";
import {
  type AuthFormState,
  emailOnlySchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/auth/schemas";

const NOT_CONFIGURED: AuthFormState = {
  status: "error",
  message: "Authentication is not configured on this deployment yet.",
};

const RATE_LIMITED = "Too many attempts. Wait a few minutes and try again.";

/** Base URL for links in auth emails. Supabase also checks it against the project's redirect allow-list. */
async function siteUrl(): Promise<string | null> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configured) return configured;
  if (APP_ENV === "staging" || APP_ENV === "production") return null;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return null;
  return `${h.get("x-forwarded-proto") ?? "http"}://${host}`;
}

const NO_SITE_URL: AuthFormState = {
  status: "error",
  message: "Email links can't be sent: NEXT_PUBLIC_SITE_URL is not configured.",
};

function fields(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string") out[k] = v;
  return out;
}

function invalid(error: z.ZodError, values: AuthFormState["values"]): AuthFormState {
  return { status: "error", fieldErrors: z.flattenError(error).fieldErrors, values };
}

function isRateLimited(error: AuthError): boolean {
  return error.status === 429 || (error.code ?? "").startsWith("over_");
}

/** Network failure or Auth outage — must never be reported as bad credentials. */
function isServiceDown(error: AuthError): boolean {
  return error.name === "AuthRetryableFetchError" || !error.status || error.status >= 500;
}

const SERVICE_DOWN = "We can't reach the sign-in service right now. Try again in a moment.";

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (!AUTH_CONFIGURED) return NOT_CONFIGURED;
  const raw = fields(formData);
  const values = { name: raw.name, email: raw.email };
  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) return invalid(parsed.error, values);

  const site = await siteUrl();
  if (!site) return NO_SITE_URL;

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.name },
      emailRedirectTo: `${site}/auth/confirm?next=/overview`,
    },
  });
  if (error) {
    if (isRateLimited(error)) return { status: "error", message: RATE_LIMITED, values };
    if (isServiceDown(error)) return { status: "error", message: SERVICE_DOWN, values };
    if (error.code === "weak_password") return { status: "error", message: error.message, values };
    if (error.code === "signup_disabled") return { status: "error", message: "Sign-ups are closed right now.", values };
    return { status: "error", message: "We couldn't create your account. Check your details and try again.", values };
  }
  redirect("/verify-email");
}

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (!AUTH_CONFIGURED) return NOT_CONFIGURED;
  const raw = fields(formData);
  const values = { email: raw.email };
  const parsed = signInSchema.safeParse(raw);
  if (!parsed.success) return invalid(parsed.error, values);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    if (error.code === "email_not_confirmed") {
      return {
        status: "error",
        message: "Verify your email address before signing in.",
        values,
        unverifiedEmail: parsed.data.email,
      };
    }
    if (isRateLimited(error)) return { status: "error", message: RATE_LIMITED, values };
    if (isServiceDown(error)) return { status: "error", message: SERVICE_DOWN, values };
    return { status: "error", message: "Invalid email or password.", values };
  }
  redirect(safeNext(parsed.data.next));
}

export async function resendVerification(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (!AUTH_CONFIGURED) return NOT_CONFIGURED;
  const parsed = emailOnlySchema.safeParse(fields(formData));
  if (!parsed.success) return invalid(parsed.error, {});
  const site = await siteUrl();
  if (!site) return NO_SITE_URL;

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: `${site}/auth/confirm?next=/overview` },
  });
  if (error && isRateLimited(error)) return { status: "error", message: RATE_LIMITED };
  if (error && isServiceDown(error)) return { status: "error", message: SERVICE_DOWN };
  // Same answer whether or not the address exists, so this can't be used to probe accounts.
  return { status: "success", message: "If that address is waiting for verification, a new link is on its way." };
}

export async function requestPasswordReset(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (!AUTH_CONFIGURED) return NOT_CONFIGURED;
  const raw = fields(formData);
  const parsed = emailOnlySchema.safeParse(raw);
  if (!parsed.success) return invalid(parsed.error, { email: raw.email });
  const site = await siteUrl();
  if (!site) return NO_SITE_URL;

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${site}/auth/confirm?next=/reset-password`,
  });
  if (error && isRateLimited(error)) return { status: "error", message: RATE_LIMITED };
  if (error && isServiceDown(error)) return { status: "error", message: SERVICE_DOWN };
  return { status: "success", message: "If an account exists for that address, we've emailed a reset link." };
}

export async function updatePassword(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (!AUTH_CONFIGURED) return NOT_CONFIGURED;
  const session = await getSession();
  if (session.state !== "signed-in") {
    return { status: "error", message: "Your reset link has expired. Request a new one." };
  }
  const parsed = resetPasswordSchema.safeParse(fields(formData));
  if (!parsed.success) return invalid(parsed.error, {});

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") return { status: "error", message: "Choose a password you haven't used here before." };
    if (error.code === "weak_password") return { status: "error", message: error.message };
    if (error.code === "reauthentication_needed") {
      return { status: "error", message: "For security, request a password reset email and use that link." };
    }
    if (isRateLimited(error)) return { status: "error", message: RATE_LIMITED };
    if (isServiceDown(error)) return { status: "error", message: SERVICE_DOWN };
    return { status: "error", message: "We couldn't update your password. Try again." };
  }
  redirect("/overview");
}

/* Social sign-in. Identity only — this is unrelated to the GitHub App that will
 * later authorise repository access. OAuth accounts arrive with the email already
 * verified by the provider, so they skip the /verify-email step. */
export async function signInWithGoogle(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (!AUTH_CONFIGURED) return NOT_CONFIGURED;
  if (!(await getEnabledProviders()).has("google")) {
    return { status: "error", message: "Google sign-in isn't enabled for this project." };
  }
  const site = await siteUrl();
  if (!site) return { status: "error", message: "Google sign-in needs NEXT_PUBLIC_SITE_URL to be configured." };

  const next = safeNext(formData.get("next"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      // Sends the PKCE code to our own callback, which exchanges it for a session.
      redirectTo: `${site}/auth/confirm?next=${encodeURIComponent(next)}`,
      skipBrowserRedirect: true,
    },
  });
  if (error || !data?.url) {
    if (error && isRateLimited(error)) return { status: "error", message: RATE_LIMITED };
    return { status: "error", message: "We couldn't start Google sign-in. Try again." };
  }
  redirect(data.url); // hands off to Google; the code verifier is already in a cookie
}

export async function signOut(): Promise<void> {
  if (AUTH_CONFIGURED) {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }
  redirect("/");
}
