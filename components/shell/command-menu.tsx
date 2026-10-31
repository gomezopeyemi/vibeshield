"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUI } from "@/components/providers";
import { NAV_ITEMS } from "@/lib/constants";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Icon, type IconName } from "@/components/ui/icon";
import { Kbd } from "@/components/ui/kbd";

interface Command {
  label: string;
  icon: IconName;
  href: string;
  group: string;
  keywords?: string;
}

export function CommandMenu() {
  const router = useRouter();
  const { commandOpen, setCommandOpen } = useUI();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = useMemo<Command[]>(() => {
    const nav: Command[] = NAV_ITEMS.map((n) => ({
      label: n.label,
      icon: n.icon as IconName,
      href: n.href,
      group: "Navigate",
    }));
    const actions: Command[] = [
      { label: "Start a new scan", icon: "Radar", href: "/onboarding", group: "Actions", keywords: "scan run" },
      { label: "Open Fix Workspace", icon: "Wrench", href: "/fix", group: "Actions", keywords: "remediate fix pr" },
      { label: "Configure rate limits", icon: "Gauge", href: "/finops", group: "Actions", keywords: "finops spend kill switch" },
      { label: "Inspect database policies", icon: "Database", href: "/database", group: "Actions", keywords: "rls supabase" },
      { label: "Run smoke tests", icon: "FlaskConical", href: "/smoke-tests", group: "Actions", keywords: "playwright test" },
    ];
    return [...actions, ...nav];
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.keywords?.toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q),
    );
  }, [commands, query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setCommandOpen]);

  useEffect(() => {
    if (commandOpen) {
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [commandOpen]);

  useEffect(() => setActive(0), [query]);

  const go = (href: string) => {
    setCommandOpen(false);
    router.push(href);
  };

  // group ordering for display
  const groups = ["Actions", "Navigate"];

  return (
    <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
      <DialogContent hideClose className="top-[18%] max-w-xl translate-y-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Command menu</DialogTitle>
        <div className="flex items-center gap-2.5 border-b border-line px-3.5">
          <Icon name="Search" className="size-4 text-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, filtered.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter" && filtered[active]) {
                e.preventDefault();
                go(filtered[active].href);
              }
            }}
            placeholder="Search screens and actions…"
            className="h-12 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-faint"
          />
          <Kbd>Esc</Kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-2 py-8 text-center text-[13px] text-faint">No results for “{query}”.</p>
          ) : (
            groups.map((g) => {
              const items = filtered.filter((c) => c.group === g);
              if (items.length === 0) return null;
              return (
                <div key={g} className="mb-1">
                  <p className="px-2 py-1 text-[10.5px] font-semibold uppercase tracking-wide text-faint">{g}</p>
                  {items.map((c) => {
                    const idx = filtered.indexOf(c);
                    return (
                      <button
                        key={c.label}
                        onMouseMove={() => setActive(idx)}
                        onClick={() => go(c.href)}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-[8px] px-2 py-2 text-left text-[13px] transition-colors",
                          active === idx ? "bg-surface-2 text-ink" : "text-ink-2",
                        )}
                      >
                        <Icon name={c.icon} className="size-4 text-faint" />
                        <span className="flex-1">{c.label}</span>
                        {active === idx && <Icon name="CornerDownLeft" className="size-3.5 text-faint" />}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
