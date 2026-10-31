import { z } from "zod";
import { LIVE_MODE, CREDENTIALS, type IntegrationKey } from "./config";

/* Shared helpers for action API routes. These routes model the REAL integration
 * contract. When the backing integration/backend is not connected they return a
 * truthful 503 — they never fake success, mutate nothing, and say what to do. */

export interface ActionError {
  ok: false;
  code:
    | "not_connected"
    | "invalid_request"
    | "forbidden"
    | "not_implemented"
    | "unauthorized"
    | "auth_not_configured";
  integration?: IntegrationKey;
  message: string;
  remediation?: string;
  issues?: unknown;
}

export interface ActionSuccess<T = unknown> {
  ok: true;
  data: T;
}

export function fail(err: Omit<ActionError, "ok">, status = 503): Response {
  return Response.json({ ok: false, ...err } satisfies ActionError, { status });
}

export function ok<T>(data: T): Response {
  return Response.json({ ok: true, data } satisfies ActionSuccess<T>);
}

/** The integration is configured but the backend call is not built yet. Never `ok`. */
export function notImplemented(message: string): Response {
  return fail(
    { code: "not_implemented", message, remediation: "This capability is not built yet; nothing was changed." },
    501,
  );
}

export async function parse<T extends z.ZodTypeAny>(
  req: Request,
  schema: T,
): Promise<{ data: z.infer<T> } | { error: Response }> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { error: fail({ code: "invalid_request", message: "Expected a JSON body." }, 400) };
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      error: fail(
        { code: "invalid_request", message: "Request failed validation.", issues: result.error.flatten() },
        400,
      ),
    };
  }
  return { data: result.data };
}

/** Guard an action behind a required integration. Returns an honest 503 when the
 * integration is not connected (which, in this build, is always — no creds). */
export function requireIntegration(
  key: IntegrationKey,
  opts: { message: string; remediation: string },
): Response | null {
  if (LIVE_MODE && CREDENTIALS[key]) return null; // real path would proceed
  return fail({
    code: "not_connected",
    integration: key,
    message: opts.message,
    remediation: opts.remediation,
  });
}
