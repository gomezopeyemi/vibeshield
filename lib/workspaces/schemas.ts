import { z } from "zod";

/* Mirrors the CHECK constraints in supabase/migrations so the form rejects
 * bad input before the database does. */

export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$/;

export const workspaceName = z.string().trim().min(1, "Enter a workspace name.").max(80, "Use at most 80 characters.");

export const workspaceSlug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(SLUG_PATTERN, "Use 1–48 lowercase letters, numbers or hyphens, not starting or ending with a hyphen.");

export const createWorkspaceSchema = z.object({ name: workspaceName, slug: workspaceSlug });

export const renameWorkspaceSchema = z.object({
  id: z.uuid(),
  name: workspaceName,
  slug: workspaceSlug,
});

export const workspaceIdSchema = z.uuid();

/** "Acme Inc." → "acme-inc". Used to suggest a slug while typing a name. */
export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/, "");
}

export interface WorkspaceFormState {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  values?: { name?: string; slug?: string };
}

export const WORKSPACE_IDLE: WorkspaceFormState = { status: "idle" };

export const CURRENT_WORKSPACE_COOKIE = "vs_workspace";
