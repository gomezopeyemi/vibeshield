"use client";

import { useCallback, useState } from "react";

export interface ActionResponse {
  ok: boolean;
  code?: string;
  integration?: string;
  message?: string;
  remediation?: string;
  data?: unknown;
}

export type ActionStatus = "idle" | "pending" | "blocked" | "ok" | "error";

/** POSTs to an action endpoint and surfaces the honest result. A `not_connected`
 * response becomes status "blocked" (shown to the user), never a fake success. */
export function useAction(endpoint: string) {
  const [status, setStatus] = useState<ActionStatus>("idle");
  const [response, setResponse] = useState<ActionResponse | null>(null);

  const run = useCallback(
    async (body: unknown) => {
      setStatus("pending");
      setResponse(null);
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = (await res.json()) as ActionResponse;
        setResponse(json);
        if (json.ok) setStatus("ok");
        else if (json.code === "not_connected") setStatus("blocked");
        else setStatus("error");
        return json;
      } catch {
        const err: ActionResponse = {
          ok: false,
          code: "error",
          message: "Could not reach the server. Check your connection and retry.",
        };
        setResponse(err);
        setStatus("error");
        return err;
      }
    },
    [endpoint],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setResponse(null);
  }, []);

  return { run, status, response, reset };
}
