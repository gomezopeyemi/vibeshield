"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSession, useUI } from "@/components/providers";
import { NAV_ITEMS, NAV_GROUPS, PLANS, planAllows } from "@/lib/constants";
import { Icon, type IconName } from "@/components/ui/icon";
import { LogoMark } from "./logo";
import { Tooltip } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { workspace, plan } = useSession();
  const { sidebarCollapsed, toggleSidebar } = useUI();
  const collapsed = sidebarCollapsed;

  const planName = PLANS.find((p) => p.tier === plan)?.name ?? plan;

  return (
    <div className="flex h-full flex-col bg-surface">
      {/* Brand */}
      <div
        className={cn(
          "flex h-14 items-center border-b border-line px-3",
          collapsed ? "justify-center" : "justify-between",
        )}
      >
        <Link
          href="/overview"
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-[7px] outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          <LogoMark />
          {!collapsed && (
            <span className="text-[15px] font-semibold tracking-tight text-ink">
              VibeShield
            </span>
          )}
        </Link>
        {!collapsed && (
          <button
            onClick={toggleSidebar}
            className="hidden rounded-[6px] p-1.5 text-faint transition-colors hover:bg-surface-2 hover:text-ink lg:block"
            aria-label="Collapse sidebar"
          >
            <Icon name="PanelLeftClose" className="size-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3">
        {collapsed && (
          <button
            onClick={toggleSidebar}
            className="mx-auto mb-2 hidden w-full justify-center rounded-[6px] p-1.5 text-faint transition-colors hover:bg-surface-2 hover:text-ink lg:flex"
            aria-label="Expand sidebar"
          >
            <Icon name="PanelLeft" className="size-4" />
          </button>
        )}
        {NAV_GROUPS.map((group) => {
          const items = NAV_ITEMS.filter((i) => i.group === group.id);
          return (
            <div key={group.id} className="mb-4">
              {!collapsed && (
                <p className="px-2 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-faint">
                  {group.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active =
                    pathname === item.href || pathname.startsWith(item.href + "/");
                  const locked = !planAllows(plan, item.minPlan);
                  const link = (
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex items-center gap-2.5 rounded-[8px] px-2 py-[7px] text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand/40",
                        collapsed && "justify-center px-0",
                        active
                          ? "bg-brand-soft text-brand-ink"
                          : "text-ink-2 hover:bg-surface-2 hover:text-ink",
                      )}
                    >
                      {active && !collapsed && (
                        <span className="absolute left-0 h-4 w-0.5 rounded-full bg-brand" />
                      )}
                      <Icon
                        name={item.icon as IconName}
                        className={cn(
                          "size-[17px] shrink-0",
                          active ? "text-brand" : "text-faint group-hover:text-muted",
                        )}
                      />
                      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                      {!collapsed && locked && (
                        <Icon name="Lock" className="size-3 text-faint" />
                      )}
                    </Link>
                  );
                  return (
                    <li key={item.href}>
                      {collapsed ? (
                        <Tooltip content={item.label} side="right">
                          {link}
                        </Tooltip>
                      ) : (
                        link
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Background activity */}
      {!collapsed && <ActivityCard />}

      {/* Workspace / plan footer */}
      <div className="border-t border-line p-2.5">
        {collapsed ? (
          <Tooltip content={`${workspace.name} · ${planName}`} side="right">
            <Link
              href="/settings"
              onClick={onNavigate}
              className="flex justify-center rounded-[8px] p-2 hover:bg-surface-2"
            >
              <div className="flex size-7 items-center justify-center rounded-[7px] bg-ink text-[11px] font-semibold text-white">
                {workspace.name.slice(0, 2).toUpperCase()}
              </div>
            </Link>
          </Tooltip>
        ) : (
          <div className="rounded-[9px] border border-line bg-surface-2/60 p-2.5">
            <div className="flex items-center gap-2">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-[7px] bg-ink text-[11px] font-semibold text-white">
                {workspace.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-medium text-ink">
                  {workspace.name}
                </p>
                <p className="text-[11px] text-muted">{planName} plan</p>
              </div>
            </div>
            <Button asChild variant="secondary" size="sm" className="mt-2 w-full">
              <Link href="/settings" onClick={onNavigate}>
                Manage plan
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Live background-activity indicator (demo: a running scan). */
function ActivityCard() {
  return (
    <div className="mx-2.5 mb-1 rounded-[9px] border border-brand-soft-2 bg-brand-soft/50 px-2.5 py-2">
      <div className="flex items-center gap-2">
        <StatusPill tone="info" label="Scan running" pulse />
      </div>
      <p className="mt-1 truncate font-mono text-[10.5px] text-brand-ink/80">
        semgrep · src/app/api/…
      </p>
    </div>
  );
}
