"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type { PlanTier, Repository, User, Workspace } from "@/lib/types";
import {
  DEMO_REPOSITORIES,
  DEMO_USER,
  DEMO_WORKSPACES,
} from "@/lib/demo/session";

/* The app is in DEMO mode until real backends/credentials are connected.
 * This flag drives the honest "DEMO DATA" banner shown across screens — it is
 * never used to fake a "connected" integration state. */
export const DEMO_MODE = true;

interface SessionValue {
  user: User;
  workspace: Workspace;
  workspaces: Workspace[];
  repositories: Repository[];
  repository: Repository | null;
  plan: PlanTier;
  demoMode: boolean;
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

export function AppProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspaceState] = useState<Workspace>(DEMO_WORKSPACES[0]);
  const [repository, setRepositoryState] = useState<Repository | null>(
    DEMO_REPOSITORIES[0],
  );

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  const repositories = useMemo(
    () => DEMO_REPOSITORIES.filter((r) => r.owner === workspace.name || true),
    [workspace],
  );

  const setWorkspace = useCallback((id: string) => {
    const ws = DEMO_WORKSPACES.find((w) => w.id === id);
    if (ws) setWorkspaceState(ws);
  }, []);

  const setRepository = useCallback((id: string | null) => {
    if (id === null) return setRepositoryState(null);
    const repo = DEMO_REPOSITORIES.find((r) => r.id === id);
    if (repo) setRepositoryState(repo);
  }, []);

  const session = useMemo<SessionValue>(
    () => ({
      user: DEMO_USER,
      workspace,
      workspaces: DEMO_WORKSPACES,
      repositories,
      repository,
      plan: workspace.plan,
      demoMode: DEMO_MODE,
      setWorkspace,
      setRepository,
    }),
    [workspace, repositories, repository, setWorkspace, setRepository],
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
