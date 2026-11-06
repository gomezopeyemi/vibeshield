"use client";

import Link from "next/link";
import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { BrandGlyph } from "@/components/ui/brand-glyph";
import { AuthNotice } from "./auth-card";
import { IDLE, type AuthFormState } from "@/lib/auth/schemas";
import {
  requestPasswordReset,
  resendVerification,
  signIn,
  signInWithGoogle,
  signUp,
  updatePassword,
} from "@/lib/auth/actions";

function Field({
  label,
  errors,
  aside,
  children,
}: {
  label: string;
  errors?: string[];
  aside?: React.ReactNode;
  children: (id: string, describedBy: string | undefined) => React.ReactNode;
}) {
  const id = useId();
  const errId = `${id}-error`;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-[12.5px] font-medium text-ink-2">{label}</label>
        {aside}
      </div>
      {children(id, errors?.length ? errId : undefined)}
      {errors?.length ? (
        <p id={errId} className="text-[12px] text-critical-ink">{errors[0]}</p>
      ) : null}
    </div>
  );
}

function FormMessage({ state }: { state: AuthFormState }) {
  if (!state.message) return null;
  return <AuthNotice tone={state.status === "success" ? "success" : "critical"}>{state.message}</AuthNotice>;
}

function Submit({ pending, disabled, idle, busy }: { pending: boolean; disabled?: boolean; idle: string; busy: string }) {
  return (
    <Button type="submit" variant="primary" size="lg" className="w-full" disabled={disabled || pending}>
      {pending ? <><Icon name="Loader2" className="animate-spin" /> {busy}</> : idle}
    </Button>
  );
}

/** Shown only when the Supabase project really has Google enabled. */
export function GoogleButton({ next, label }: { next?: string; label: string }) {
  const [state, action, pending] = useActionState(signInWithGoogle, IDLE);
  return (
    <div className="space-y-3">
      <form action={action}>
        <input type="hidden" name="next" value={next ?? ""} />
        <Button type="submit" variant="secondary" size="lg" className="w-full" disabled={pending}>
          {pending ? <Icon name="Loader2" className="animate-spin" /> : <BrandGlyph name="google" size={17} />}
          {label}
        </Button>
      </form>
      <FormMessage state={state} />
    </div>
  );
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-3" aria-hidden>
      <span className="h-px flex-1 bg-line" />
      <span className="text-[11.5px] uppercase tracking-wide text-faint">or</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

export function LoginForm({ next, disabled }: { next?: string; disabled: boolean }) {
  const [state, action, pending] = useActionState(signIn, IDLE);
  return (
    <div className="space-y-4">
      <form action={action} className="space-y-4" noValidate>
        <input type="hidden" name="next" value={next ?? ""} />
        <Field label="Email" errors={state.fieldErrors?.email}>
          {(id, d) => (
            <Input id={id} aria-describedby={d} name="email" type="email" autoComplete="email" required
              defaultValue={state.values?.email} invalid={Boolean(d)} disabled={disabled} />
          )}
        </Field>
        <Field
          label="Password"
          errors={state.fieldErrors?.password}
          aside={<Link href="/forgot-password" className="text-[12px] font-medium text-brand hover:text-brand-ink">Forgot password?</Link>}
        >
          {(id, d) => (
            <Input id={id} aria-describedby={d} name="password" type="password" autoComplete="current-password" required
              invalid={Boolean(d)} disabled={disabled} />
          )}
        </Field>
        <FormMessage state={state} />
        <Submit pending={pending} disabled={disabled} idle="Sign in" busy="Signing in…" />
      </form>
      {state.unverifiedEmail && <ResendVerificationForm email={state.unverifiedEmail} />}
    </div>
  );
}

/** `defaultEmail` comes from the home page's email box (validated by the page). */
export function SignupForm({ disabled, defaultEmail }: { disabled: boolean; defaultEmail?: string }) {
  const [state, action, pending] = useActionState(signUp, IDLE);
  return (
    <form action={action} className="space-y-4" noValidate>
      <Field label="Name" errors={state.fieldErrors?.name}>
        {(id, d) => (
          <Input id={id} aria-describedby={d} name="name" autoComplete="name" required maxLength={80}
            defaultValue={state.values?.name} invalid={Boolean(d)} disabled={disabled} />
        )}
      </Field>
      <Field label="Work email" errors={state.fieldErrors?.email}>
        {(id, d) => (
          <Input id={id} aria-describedby={d} name="email" type="email" autoComplete="email" required
            defaultValue={state.values?.email ?? defaultEmail} invalid={Boolean(d)} disabled={disabled} />
        )}
      </Field>
      <Field label="Password" errors={state.fieldErrors?.password}>
        {(id, d) => (
          <Input id={id} aria-describedby={d} name="password" type="password" autoComplete="new-password"
            placeholder="At least 8 characters" required minLength={8} maxLength={72} invalid={Boolean(d)} disabled={disabled} />
        )}
      </Field>
      <FormMessage state={state} />
      <Submit pending={pending} disabled={disabled} idle="Create account" busy="Creating account…" />
      <p className="text-center text-[11.5px] leading-relaxed text-faint">
        By creating an account you agree to the <Link href="/terms" className="underline underline-offset-2">Terms</Link> and{" "}
        <Link href="/privacy" className="underline underline-offset-2">Privacy Policy</Link>.
      </p>
    </form>
  );
}

export function ForgotPasswordForm({ disabled }: { disabled: boolean }) {
  const [state, action, pending] = useActionState(requestPasswordReset, IDLE);
  if (state.status === "success") return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-4" noValidate>
      <Field label="Email" errors={state.fieldErrors?.email}>
        {(id, d) => (
          <Input id={id} aria-describedby={d} name="email" type="email" autoComplete="email" required
            defaultValue={state.values?.email} invalid={Boolean(d)} disabled={disabled} />
        )}
      </Field>
      <FormMessage state={state} />
      <Submit pending={pending} disabled={disabled} idle="Send reset link" busy="Sending…" />
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, IDLE);
  return (
    <form action={action} className="space-y-4" noValidate>
      <Field label="New password" errors={state.fieldErrors?.password}>
        {(id, d) => (
          <Input id={id} aria-describedby={d} name="password" type="password" autoComplete="new-password"
            required minLength={8} maxLength={72} invalid={Boolean(d)} />
        )}
      </Field>
      <Field label="Confirm new password" errors={state.fieldErrors?.confirm}>
        {(id, d) => (
          <Input id={id} aria-describedby={d} name="confirm" type="password" autoComplete="new-password" required invalid={Boolean(d)} />
        )}
      </Field>
      <FormMessage state={state} />
      <Submit pending={pending} idle="Update password" busy="Updating…" />
    </form>
  );
}

/** With `email` it is a one-click resend; without, it asks for the address. */
export function ResendVerificationForm({ email, disabled }: { email?: string; disabled?: boolean }) {
  const [state, action, pending] = useActionState(resendVerification, IDLE);
  if (state.status === "success") return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-3" noValidate>
      {email ? (
        <input type="hidden" name="email" value={email} />
      ) : (
        <Field label="Email" errors={state.fieldErrors?.email}>
          {(id, d) => (
            <Input id={id} aria-describedby={d} name="email" type="email" autoComplete="email" required
              invalid={Boolean(d)} disabled={disabled} />
          )}
        </Field>
      )}
      <FormMessage state={state} />
      <Button type="submit" variant="secondary" className="w-full" disabled={disabled || pending}>
        {pending ? <><Icon name="Loader2" className="animate-spin" /> Sending…</> : <><Icon name="Mail" /> Resend verification email</>}
      </Button>
    </form>
  );
}
