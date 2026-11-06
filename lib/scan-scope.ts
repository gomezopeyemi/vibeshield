import "server-only";
import { cache } from "react";
import { requireUser } from "./auth/session";
import { getWorkspaceContext } from "./workspaces/data";
import type { WorkspaceRole } from "./types";

/* Where the signed-in user's scans live right now, and whether they may run one.
 * Derived from the RLS-verified workspace context, never from client input. */

export interface ScanScope {
  userId: string;
  /** A real workspace id when `durable`; otherwise a key private to this user. */
  key: string;
  /** The workspace tables exist and `key` is a workspace the user belongs to. */
  durable: boolean;
  canScan: boolean;
  /** Why the scope isn't durable, for the storage notice. */
  reason?: string;
}

const SCANNING_ROLES: readonly WorkspaceRole[] = ["owner", "admin", "developer"];

const NOT_DURABLE = {
  demo: "Demo session: scans are held in server memory only.",
  not_provisioned: "Workspaces aren't set up on this Supabase project yet, so scans are held in server memory only.",
  error: "Your workspaces couldn't be loaded, so this scan is held in server memory only.",
} as const;

export const getScanScope = cache(async (): Promise<ScanScope> => {
  const user = await requireUser();
  const ctx = await getWorkspaceContext();
  if (ctx.state === "ready") {
    const role = ctx.current.role;
    return { userId: user.id, key: ctx.current.id, durable: true, canScan: role !== undefined && SCANNING_ROLES.includes(role) };
  }
  // Not set up (or unreadable): scans stay with this user, in memory, and say so.
  return {
    userId: user.id,
    key: `${ctx.state}:${user.id}`,
    durable: false,
    canScan: true,
    reason: NOT_DURABLE[ctx.state],
  };
});
