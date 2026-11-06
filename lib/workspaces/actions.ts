"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isMissingSchema } from "./data";
import {
  CURRENT_WORKSPACE_COOKIE,
  createWorkspaceSchema,
  renameWorkspaceSchema,
  workspaceIdSchema,
  type WorkspaceFormState,
} from "./schemas";

/* Every action re-checks the session; RLS and the membership guard in the
 * database are the real authority — these only translate their answers. */

const DEMO: WorkspaceFormState = { status: "error", message: "Workspaces can't be changed in the demo session." };
const NOT_PROVISIONED: WorkspaceFormState = {
  status: "error",
  message: "The workspace database isn't set up yet. Apply the migrations in supabase/migrations first.",
};

function fields(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string") out[k] = v;
  return out;
}

function dbError(error: { code?: string }, values: WorkspaceFormState["values"]): WorkspaceFormState {
  if (isMissingSchema(error)) return { ...NOT_PROVISIONED, values };
  if (error.code === "23505") return { status: "error", fieldErrors: { slug: ["That URL is already taken."] }, values };
  if (error.code === "23514") return { status: "error", message: "Check the name and URL and try again.", values };
  if (error.code === "42501") return { status: "error", message: "You don't have permission to do that.", values };
  return { status: "error", message: "Something went wrong. Try again.", values };
}

async function rememberWorkspace(id: string) {
  (await cookies()).set(CURRENT_WORKSPACE_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function createWorkspace(_prev: WorkspaceFormState, formData: FormData): Promise<WorkspaceFormState> {
  const user = await requireUser();
  if (user.demo) return DEMO;
  const raw = fields(formData);
  const values = { name: raw.name, slug: raw.slug };
  const parsed = createWorkspaceSchema.safeParse(raw);
  if (!parsed.success) return { status: "error", fieldErrors: z.flattenError(parsed.error).fieldErrors, values };

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("create_workspace", { ws_name: parsed.data.name, ws_slug: parsed.data.slug })
    .single();
  if (error) return dbError(error, values);

  const id = z.object({ id: z.string() }).parse(data).id;
  await rememberWorkspace(id);
  refresh();
  return { status: "success", message: `${parsed.data.name} is ready.` };
}

/** Switch only to a workspace the database confirms the caller can see. */
export async function switchWorkspace(workspaceId: string): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const id = workspaceIdSchema.safeParse(workspaceId);
  if (user.demo || !id.success) return { ok: false };

  const supabase = await createClient();
  const { data, error } = await supabase.from("workspaces").select("id").eq("id", id.data).maybeSingle();
  if (error || !data) return { ok: false };

  await rememberWorkspace(id.data);
  refresh();
  return { ok: true };
}

export async function renameWorkspace(_prev: WorkspaceFormState, formData: FormData): Promise<WorkspaceFormState> {
  const user = await requireUser();
  if (user.demo) return DEMO;
  const raw = fields(formData);
  const values = { name: raw.name, slug: raw.slug };
  const parsed = renameWorkspaceSchema.safeParse(raw);
  if (!parsed.success) return { status: "error", fieldErrors: z.flattenError(parsed.error).fieldErrors, values };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspaces")
    .update({ name: parsed.data.name, slug: parsed.data.slug })
    .eq("id", parsed.data.id)
    .select("id");
  if (error) return dbError(error, values);
  // RLS filters the update to zero rows when the caller isn't an owner/admin.
  if (!data || data.length === 0) return { status: "error", message: "Only owners and admins can rename this workspace.", values };

  refresh();
  return { status: "success", message: "Workspace updated." };
}
