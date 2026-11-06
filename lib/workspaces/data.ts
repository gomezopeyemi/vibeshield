import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { DEMO_WORKSPACES } from "@/lib/demo/session";
import { CURRENT_WORKSPACE_COOKIE } from "./schemas";
import type { PlanTier, Workspace, WorkspaceContext, WorkspaceMember, WorkspaceRole } from "@/lib/types";

/* Workspace data access. Reads run as the signed-in user, so RLS decides what
 * comes back; this layer never widens it. */

// Shown while the schema isn't there, so the shell still renders. Never persisted.
const PLACEHOLDER: Workspace = { id: "ws_personal", name: "Personal", slug: "personal", plan: "free", memberCount: 1, role: "owner" };

const ROLE = z.enum(["owner", "admin", "developer", "viewer"]);
const PLAN = z.enum(["free", "builder", "pro", "team"]);

const workspaceRow = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  plan: PLAN.catch("free"),
  workspace_members: z.array(z.object({ count: z.number() })).catch([]),
});

const membershipRow = z.object({ workspace_id: z.string(), role: ROLE });

const memberRow = z.object({
  user_id: z.string(),
  role: ROLE,
  created_at: z.string(),
  profiles: z.object({ full_name: z.string() }).nullable(),
});

type PgError = { code?: string; message?: string } | null;

/** The table or function isn't there: migrations haven't been applied to this project. */
export function isMissingSchema(error: PgError): boolean {
  return error?.code === "PGRST205" || error?.code === "PGRST202" || error?.code === "42P01" || error?.code === "42883";
}

const NOT_PROVISIONED =
  "The workspace database isn't set up on this Supabase project yet. Apply the SQL files in supabase/migrations to enable workspaces and teams.";

function fallback(state: "not_provisioned" | "error", message: string): WorkspaceContext {
  return { state, workspaces: [PLACEHOLDER], current: PLACEHOLDER, message };
}

export const getWorkspaceContext = cache(async (): Promise<WorkspaceContext> => {
  const user = await requireUser();
  if (user.demo) return { state: "demo", workspaces: DEMO_WORKSPACES, current: DEMO_WORKSPACES[0] };

  const supabase = await createClient();
  const [ws, mine] = await Promise.all([
    supabase.from("workspaces").select("id, name, slug, plan, workspace_members(count)").order("created_at"),
    supabase.from("workspace_members").select("workspace_id, role").eq("user_id", user.id),
  ]);
  const error = ws.error ?? mine.error;
  if (error) {
    return isMissingSchema(error)
      ? fallback("not_provisioned", NOT_PROVISIONED)
      : fallback("error", "Your workspaces couldn't be loaded. Refresh to try again.");
  }

  const roles = new Map<string, WorkspaceRole>();
  for (const row of z.array(membershipRow).parse(mine.data ?? [])) roles.set(row.workspace_id, row.role);

  const workspaces: Workspace[] = z
    .array(workspaceRow)
    .parse(ws.data ?? [])
    .filter((w) => roles.has(w.id))
    .map((w) => ({
      id: w.id,
      name: w.name,
      slug: w.slug,
      plan: w.plan as PlanTier,
      memberCount: w.workspace_members[0]?.count ?? 1,
      role: roles.get(w.id),
    }));

  if (workspaces.length === 0) {
    return fallback("error", "Your account has no workspace yet. Create one to get started.");
  }

  const chosen = (await cookies()).get(CURRENT_WORKSPACE_COOKIE)?.value;
  return { state: "ready", workspaces, current: workspaces.find((w) => w.id === chosen) ?? workspaces[0] };
});

/** Members of a workspace the caller belongs to (RLS returns nothing otherwise). */
export async function listMembers(workspaceId: string): Promise<WorkspaceMember[] | null> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_members")
    .select("user_id, role, created_at, profiles(full_name)")
    .eq("workspace_id", workspaceId)
    .order("created_at");
  if (error) return null;
  return z
    .array(memberRow)
    .parse(data ?? [])
    .map((m) => ({
      workspaceId,
      userId: m.user_id,
      role: m.role,
      fullName: m.profiles?.full_name || "Unnamed member",
      joinedAt: m.created_at,
    }));
}
