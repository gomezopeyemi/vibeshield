"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type { PlanTier, Repository, SessionUser, User, Workspace } from "@/lib/types";
import type { AppEnv } from "@/lib/config";
import {
  DEMO_REPOSITORIES,
  DEMO_USER,
  DEMO_WORKSPACES,
} from "@/lib/demo/session";

// Real accounts have no workspace records until Stage 2; this placeholder is never persisted.
const PERSONAL_WORKSPACE: Workspace = {
  id: "ws_personal",
  name: "Personal",
  slug: "personal",
  plan: "free",
  memberCount: 1,
};

interface SessionValue {
  /** Deployment environment from the server (VIBESHIELD_ENV), not a fixture. */
  appEnv: AppEnv;
  /** True when the signed-in identity is the demo fixture (auth not configured). */
  demoSession: boolean;
  user: User;
  workspace: Workspace;
  workspaces: Workspace[];
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
}: {
  children: ReactNode;
  appEnv: AppEnv;
  sessionUser: SessionUser;
}) {
  const demoSession = sessionUser.demo;
  const workspaces = useMemo(() => (demoSession ? DEMO_WORKSPACES : [PERSONAL_WORKSPACE]), [demoSession]);
  const repositories = useMemo(() => (demoSession ? DEMO_REPOSITORIES : []), [demoSession]);

  const [workspace, setWorkspaceState] = useState<Workspace>(workspaces[0]);
  const [repository, setRepositoryState] = useState<Repository | null>(repositories[0] ?? null);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  const setWorkspace = useCallback(
    (id: string) => {
      const ws = workspaces.find((w) => w.id === id);
      if (ws) setWorkspaceState(ws);
    },
    [workspaces],
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
      repositories,
      repository,
      plan: workspace.plan,
      setWorkspace,
      setRepository,
    }),
    [appEnv, demoSession, user, workspace, workspaces, repositories, repository, setWorkspace, setRepository],
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
