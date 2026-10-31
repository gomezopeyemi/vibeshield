"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useSession, useUI } from "@/components/providers";
import { Icon } from "@/components/ui/icon";
import { Avatar } from "@/components/ui/avatar";
import { Kbd } from "@/components/ui/kbd";
import { Badge } from "@/components/ui/badge";
import { ConnectionPill } from "@/components/ui/status-pill";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function Topbar() {
  const { workspace, workspaces, repositories, repository, setWorkspace, setRepository } =
    useSession();
  const { setMobileNavOpen, setCommandOpen } = useUI();

  const envTone =
    workspace.environment === "production"
      ? "success"
      : workspace.environment === "staging"
        ? "warning"
        : "neutral";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-canvas/85 px-3 backdrop-blur-md sm:px-4">
      {/* Mobile nav */}
      <button
        onClick={() => setMobileNavOpen(true)}
        className="rounded-[7px] p-1.5 text-ink-2 hover:bg-surface-2 lg:hidden"
        aria-label="Open navigation"
      >
        <Icon name="Menu" className="size-5" />
      </button>

      {/* Workspace selector */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex h-9 items-center gap-1.5 rounded-[8px] px-2 text-[13px] font-medium text-ink outline-none transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-brand/40">
          <div className="flex size-5 items-center justify-center rounded-[5px] bg-ink text-[9px] font-semibold text-white">
            {workspace.name.slice(0, 2).toUpperCase()}
          </div>
          <span className="hidden max-w-[120px] truncate sm:inline">{workspace.name}</span>
          <Icon name="ChevronsUpDown" className="size-3.5 text-faint" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          {workspaces.map((w) => (
            <DropdownMenuItem key={w.id} onSelect={() => setWorkspace(w.id)}>
              <div className="flex size-5 items-center justify-center rounded-[5px] bg-ink text-[9px] font-semibold text-white">
                {w.name.slice(0, 2).toUpperCase()}
              </div>
              <span className="flex-1 truncate">{w.name}</span>
              {w.id === workspace.id && <Icon name="Check" className="size-4 text-brand" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Icon name="Plus" /> New workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <span className="hidden text-line-strong sm:inline">/</span>

      {/* Repository selector */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex h-9 items-center gap-1.5 rounded-[8px] px-2 text-[13px] font-medium text-ink outline-none transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-brand/40">
          <Icon name="GitBranch" className="size-4 text-faint" />
          <span className="max-w-[160px] truncate">
            {repository ? repository.name : "Select repository"}
          </span>
          <Icon name="ChevronsUpDown" className="size-3.5 text-faint" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64">
          <DropdownMenuLabel>Repositories</DropdownMenuLabel>
          {repositories.map((r) => (
            <DropdownMenuItem key={r.id} onSelect={() => setRepository(r.id)}>
              <Icon name="GitBranch" className="size-4" />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate">{r.name}</span>
                <span className="truncate text-[11px] text-faint">{r.fullName}</span>
              </div>
              {repository?.id === r.id ? (
                <Icon name="Check" className="size-4 text-brand" />
              ) : (
                <span className={cn("size-1.5 rounded-full", r.connection === "connected" ? "bg-success" : "bg-faint")} />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/onboarding">
              <Icon name="Plus" /> Connect repository
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Environment indicator */}
      <Badge tone={envTone as "success" | "warning" | "neutral"} size="md" className="hidden capitalize md:inline-flex">
        <span className={cn("size-1.5 rounded-full", envTone === "success" ? "bg-success" : envTone === "warning" ? "bg-warning" : "bg-faint")} />
        {workspace.environment}
      </Badge>

      <div className="flex-1" />

      {/* Global search */}
      <button
        onClick={() => setCommandOpen(true)}
        className="flex h-9 items-center gap-2 rounded-[8px] border border-line-strong bg-surface px-2.5 text-[13px] text-faint outline-none transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        <Icon name="Search" className="size-4" />
        <span className="hidden lg:inline">Search…</span>
        <Kbd className="hidden lg:inline-flex">⌘K</Kbd>
      </button>

      {/* Notifications */}
      <Notifications />

      {/* User menu */}
      <UserMenu />
    </header>
  );
}

function Notifications() {
  const items = [
    { icon: "GitPullRequest" as const, title: "PR #241 checks passed", time: "2h ago", tone: "success" as const },
    { icon: "ShieldAlert" as const, title: "New critical finding: exposed service role key", time: "2h ago", tone: "critical" as const },
    { icon: "FlaskConical" as const, title: "Smoke test: Checkout flow pending", time: "3h ago", tone: "warning" as const },
  ];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative rounded-[7px] p-2 text-ink-2 outline-none transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-brand/40">
        <Icon name="Bell" className="size-[18px]" />
        <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-critical ring-2 ring-canvas" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        {items.map((it, i) => (
          <DropdownMenuItem key={i} className="items-start gap-2.5 py-2">
            <span
              className={cn(
                "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
                it.tone === "success" && "bg-success-soft",
                it.tone === "critical" && "bg-critical-soft",
                it.tone === "warning" && "bg-warning-soft",
              )}
            >
              <Icon
                name={it.icon}
                className={cn(
                  "!size-3.5",
                  it.tone === "success" && "!text-success",
                  it.tone === "critical" && "!text-critical",
                  it.tone === "warning" && "!text-warning-ink",
                )}
              />
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="text-[12.5px] leading-snug text-ink">{it.title}</span>
              <span className="text-[11px] text-faint">{it.time}</span>
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="justify-center text-brand">View all activity</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserMenu() {
  const { user, plan } = useSession();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
        <Avatar name={user.name} src={user.avatarUrl} size={30} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <Avatar name={user.name} size={34} />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-ink">{user.name}</p>
            <p className="truncate text-[11.5px] text-muted">{user.email}</p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings"><Icon name="User" /> Account</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings"><Icon name="CreditCard" /> Billing · <span className="capitalize">{plan}</span></Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/integrations"><Icon name="Plug" /> Integrations</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem tone="danger"><Icon name="LogOut" /> Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
