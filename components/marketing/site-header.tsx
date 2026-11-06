"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAND, NAV_PRODUCT, NAV_RESOURCES, NAV_SOLUTIONS, type NavLink } from "@/lib/brand";
import { MegaMenu } from "./mega-menu";
import { PillLink } from "./pill-link";
import { Wordmark } from "./brand-mark";

const MOBILE_GROUPS: { title: string; links: NavLink[] }[] = [
  { title: "Product", links: NAV_PRODUCT },
  { title: "Solutions", links: NAV_SOLUTIONS },
  { title: "Resources", links: NAV_RESOURCES.flatMap((c) => c.columns.flat()) },
  { title: "Plans", links: [{ label: "Pricing", href: "/pricing" }] },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-mk-ink/8 bg-white text-mk-ink">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-4 px-4 sm:px-6 lg:h-[72px]">
        <Link href="/" aria-label={`${BRAND.name} home`} className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-mk-violet">
          <Wordmark />
        </Link>
        <div className="flex flex-1 justify-center">
          <MegaMenu />
        </div>
        <PillLink href={BRAND.login.href} variant="outline" className="hidden h-10 sm:inline-flex">
          {BRAND.login.label}
        </PillLink>
        <PillLink href={BRAND.cta.href} arrow className="hidden h-10 sm:inline-flex">
          {BRAND.cta.label}
        </PillLink>
        <button
          type="button"
          className="grid size-10 place-items-center rounded-full outline-none hover:bg-mk-ink/5 focus-visible:ring-2 focus-visible:ring-mk-violet lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <nav
        id="mobile-nav"
        aria-label="Main"
        hidden={!open}
        className="max-h-[calc(100dvh-64px)] overflow-y-auto border-t border-mk-ink/8 px-4 pb-6 pt-2 lg:hidden"
      >
        {MOBILE_GROUPS.map((g) => (
          <div key={g.title} className="border-b border-mk-ink/8 py-3">
            <p className="px-2 pb-1 text-[12px] font-medium uppercase tracking-[0.12em] text-mk-ink/55">{g.title}</p>
            <ul>
              {g.links.map((l) => (
                <li key={`${g.title}-${l.label}`}>
                  {l.href ? (
                    <Link href={l.href} onClick={() => setOpen(false)} className="block rounded-lg px-2 py-2 text-[15px] font-medium hover:bg-mk-ink/5">
                      {l.label}
                    </Link>
                  ) : (
                    <span className="flex items-center gap-2 px-2 py-2 text-[15px] text-mk-ink/55">
                      {l.label}
                      <span className="rounded-full bg-mk-ink/8 px-1.5 text-[10.5px]">Soon</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className={cn("flex gap-2 pt-4 sm:hidden")}>
          <PillLink href={BRAND.login.href} variant="outline" className="flex-1 justify-center">{BRAND.login.label}</PillLink>
          <PillLink href={BRAND.cta.href} className="flex-1 justify-center">{BRAND.cta.label}</PillLink>
        </div>
      </nav>
    </header>
  );
}
