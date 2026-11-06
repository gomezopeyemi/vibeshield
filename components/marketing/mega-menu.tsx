"use client";

import { useState } from "react";
import Link from "next/link";
import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_PRODUCT, NAV_RESOURCES, NAV_SOLUTIONS, type NavLink } from "@/lib/brand";

const TRIGGER =
  "group inline-flex h-10 items-center gap-1 rounded-full px-3.5 text-[14.5px] font-medium outline-none transition-colors hover:bg-mk-ink/5 focus-visible:ring-2 focus-visible:ring-mk-violet data-[state=open]:bg-mk-ink/5";

const PANEL = "rounded-2xl bg-mk-cta/90 p-3 text-white shadow-[0_24px_60px_-20px_rgb(31_1_61/0.55)] ring-1 ring-white/10 backdrop-blur-xl";

function Chevron() {
  return <ChevronDown aria-hidden className="size-4 opacity-60 transition-transform duration-200 group-data-[state=open]:rotate-180" />;
}

/** A link, or a labelled placeholder for something that isn't built yet. */
function MenuLink({ item, compact = false }: { item: NavLink; compact?: boolean }) {
  const body = (
    <>
      <span className="flex items-center gap-2 text-[14px] font-medium">
        {item.label}
        {!item.href && <span className="rounded-full bg-white/12 px-1.5 py-px text-[10.5px] font-medium text-white/70">Soon</span>}
      </span>
      {!compact && item.description && <span className="mt-0.5 block text-[12.5px] text-white/65">{item.description}</span>}
    </>
  );
  const cls = "block rounded-xl px-3 py-2.5";
  if (!item.href) return <div className={cn(cls, "cursor-default opacity-75")}>{body}</div>;
  return (
    <NavigationMenu.Link asChild>
      <Link href={item.href} className={cn(cls, "outline-none transition-colors hover:bg-white/10 focus-visible:bg-white/10")}>
        {body}
      </Link>
    </NavigationMenu.Link>
  );
}

function Dropdown({ label, items }: { label: string; items: NavLink[] }) {
  return (
    <NavigationMenu.Item className="relative">
      <NavigationMenu.Trigger className={TRIGGER}>
        {label} <Chevron />
      </NavigationMenu.Trigger>
      <NavigationMenu.Content className="mk-menu absolute left-0 top-full z-50 pt-3">
        <ul className={cn(PANEL, "w-[320px]")}>
          {items.map((i) => (
            <li key={i.label}><MenuLink item={i} /></li>
          ))}
        </ul>
      </NavigationMenu.Content>
    </NavigationMenu.Item>
  );
}

function ResourcesMenu() {
  const [active, setActive] = useState(0);
  const current = NAV_RESOURCES[active];
  return (
    <NavigationMenu.Item className="relative">
      <NavigationMenu.Trigger className={TRIGGER}>
        Resources <Chevron />
      </NavigationMenu.Trigger>
      <NavigationMenu.Content className="mk-menu absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3">
        <div className={cn(PANEL, "grid w-[600px] grid-cols-[200px_1fr] gap-2")}>
          <ul className="border-r border-white/10 pr-2" aria-label="Resource categories">
            {NAV_RESOURCES.map((c, i) => (
              <li key={c.category}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onClick={() => setActive(i)}
                  aria-current={i === active ? "true" : undefined}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[14px] font-medium outline-none transition-colors",
                    i === active ? "bg-white/12" : "text-white/75 hover:bg-white/8",
                    "focus-visible:ring-2 focus-visible:ring-white/50",
                  )}
                >
                  {c.category}
                  <ChevronRight aria-hidden className="size-4 opacity-60" />
                </button>
              </li>
            ))}
          </ul>
          <div key={current.category} className="grid grid-cols-2 content-start gap-1">
            {current.columns.map((col, ci) => (
              <ul key={ci}>
                {col.map((i) => (
                  <li key={i.label}><MenuLink item={i} compact /></li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      </NavigationMenu.Content>
    </NavigationMenu.Item>
  );
}

export function MegaMenu() {
  return (
    <NavigationMenu.Root aria-label="Main" delayDuration={60} className="hidden lg:block">
      <NavigationMenu.List className="flex items-center gap-0.5">
        <Dropdown label="Product" items={NAV_PRODUCT} />
        <Dropdown label="Solutions" items={NAV_SOLUTIONS} />
        <ResourcesMenu />
        <NavigationMenu.Item>
          <NavigationMenu.Link asChild>
            <Link href="/pricing" className={TRIGGER}>Plans</Link>
          </NavigationMenu.Link>
        </NavigationMenu.Item>
      </NavigationMenu.List>
    </NavigationMenu.Root>
  );
}
