import { z } from "zod";

const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.").max(254));

// 72 bytes is bcrypt's limit; longer passwords would be silently truncated.
export const newPassword = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Use at most 72 characters.");

export const signUpSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(80, "Use at most 80 characters."),
  email,
  password: newPassword,
});

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password.").max(72),
  next: z.string().optional(),
});

export const emailOnlySchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ password: newPassword, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "Passwords don't match.", path: ["confirm"] });

export interface AuthFormState {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  /** Echoed back so the form keeps what the user typed (never the password). */
  values?: { name?: string; email?: string };
  /** Set when sign-in failed only because the address is not verified yet. */
  unverifiedEmail?: string;
}

export const IDLE: AuthFormState = { status: "idle" };
