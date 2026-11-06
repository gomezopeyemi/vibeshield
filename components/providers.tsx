"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useTransition,
  type ReactNode,
} from "react";
import type { PlanTier, Repository, SessionUser, User, Workspace, WorkspaceContext, WorkspaceState } from "@/lib/types";
import { switchWorkspace } from "@/lib/workspaces/actions";
import type { AppEnv } from "@/lib/config";
import { DEMO_REPOSITORIES, DEMO_USER } from "@/lib/demo/session";

interface SessionValue {
  /** Deployment environment from the server (VIBESHIELD_ENV), not a fixture. */
  appEnv: AppEnv;
  /** True when the signed-in identity is the demo fixture (auth not configured). */
  demoSession: boolean;
  user: User;
  workspace: Workspace;
  workspaces: Workspace[];
  /** Where the workspace list came from; only "ready" means real, editable rows. */
  workspaceState: WorkspaceState;
  workspaceMessage?: string;
  switchingWorkspace: boolean;
  repositories: Repository[];
  repository: Repository | null;
  plan: PlanTier;
  setWorkspace: (id: string) => void;
  setRepository: (id: string | null) => void;
}

interface UIValue {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  mobileNavOpen: boolean;
  setMobileNavOpen: (v: boolean) => void;
  commandOpen: boolean;
  setCommandOpen: (v: boolean) => void;
}

const SessionContext = createContext<SessionValue | null>(null);
const UIContext = createContext<UIValue | null>(null);

export function AppProvider({
  children,
  appEnv,
  sessionUser,
  workspaceContext,
}: {
  children: ReactNode;
  appEnv: AppEnv;
  sessionUser: SessionUser;
  workspaceContext: WorkspaceContext;
}) {
  const demoSession = sessionUser.demo;
  const { workspaces, state: workspaceState, message: workspaceMessage } = workspaceContext;
  const repositories = useMemo(() => (demoSession ? DEMO_REPOSITORIES : []), [demoSession]);

  // Real workspaces: the server (cookie) owns the selection. Demo fixtures switch locally.
  const [demoWorkspaceId, setDemoWorkspaceId] = useState(workspaceContext.current.id);
  const [switchingWorkspace, startSwitch] = useTransition();
  const workspace =
    workspaceState === "demo"
      ? (workspaces.find((w) => w.id === demoWorkspaceId) ?? workspaceContext.current)
      : workspaceContext.current;
  const [repository, setRepositoryState] = useState<Repository | null>(repositories[0] ?? null);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  const setWorkspace = useCallback(
    (id: string) => {
      if (workspaceState === "demo") return setDemoWorkspaceId(id);
      if (workspaceState !== "ready") return;
      startSwitch(async () => {
        await switchWorkspace(id);
      });
    },
    [workspaceState],
  );

  const setRepository = useCallback(
    (id: string | null) => {
      if (id === null) return setRepositoryState(null);
      const repo = repositories.find((r) => r.id === id);
      if (repo) setRepositoryState(repo);
    },
    [repositories],
  );

  const user = useMemo<User>(
    () =>
      demoSession
        ? DEMO_USER
        : { id: sessionUser.id, name: sessionUser.name, email: sessionUser.email, plan: "free" },
    [demoSession, sessionUser],
  );

  const session = useMemo<SessionValue>(
    () => ({
      appEnv,
      demoSession,
      user,
      workspace,
      workspaces,
      workspaceState,
      workspaceMessage,
      switchingWorkspace,
      repositories,
      repository,
      plan: workspace.plan,
      setWorkspace,
      setRepository,
    }),
    [appEnv, demoSession, user, workspace, workspaces, workspaceState, workspaceMessage, switchingWorkspace, repositories, repository, setWorkspace, setRepository],
  );

  const ui = useMemo<UIValue>(
    () => ({
      sidebarCollapsed,
      toggleSidebar: () => setSidebarCollapsed((v) => !v),
      mobileNavOpen,
      setMobileNavOpen,
      commandOpen,
      setCommandOpen,
    }),
    [sidebarCollapsed, mobileNavOpen, commandOpen],
  );

  return (
    <SessionContext.Provider value={session}>
      <UIContext.Provider value={ui}>{children}</UIContext.Provider>
    </SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within AppProvider");
  return ctx;
}

export function useUI(): UIValue {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used within AppProvider");
  return ctx;
}
