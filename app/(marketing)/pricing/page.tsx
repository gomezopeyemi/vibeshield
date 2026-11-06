import type { Metadata } from "next";
import Link from "next/link";
import { Check, Info } from "lucide-react";
import { PLANS } from "@/lib/constants";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { PageIntro } from "@/components/marketing/page-intro";
import { PillLink } from "@/components/marketing/pill-link";

export const metadata: Metadata = { title: "Pricing" };

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-[1240px] px-4 py-16 sm:px-6 sm:py-24">
      <PageIntro eyebrow="Plans" title="Pricing">
        Start free. Paid plans unlock as their features ship.
      </PageIntro>

      <div className="mt-8 flex max-w-3xl gap-3 rounded-2xl bg-mk-card px-5 py-4 text-[14px] leading-relaxed text-mk-ink">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-mk-violet" />
        <p>
          Billing isn&apos;t live yet. During early access every account is on the free plan, and several paid features
          are still in development. See{" "}
          <Link href="/features" className="font-medium text-mk-violet underline underline-offset-2">Features</Link> for what works today.
        </p>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((p) => {
          const free = p.tier === "free";
          return (
            <div
              key={p.tier}
              className={cn(
                "flex flex-col rounded-2xl p-6",
                free ? "bg-mk-cta text-white" : "bg-white text-mk-ink ring-1 ring-mk-ink/8",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[15px] font-semibold">{p.name}</h2>
                {free && <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11.5px] font-medium">Available now</span>}
              </div>
              <p className="mt-4 font-display text-[44px] leading-none">{p.priceLabel}</p>
              <p className="mt-2 text-[14px] opacity-70">{p.tagline}</p>
              <ul className="mt-6 flex-1 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2 text-[14px]">
                    <Check aria-hidden className={cn("mt-0.5 size-4 shrink-0", free ? "text-mk-lavender" : "opacity-40")} />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                {free ? (
                  <PillLink href={BRAND.cta.href} variant="violet" className="w-full justify-center bg-white text-mk-cta hover:bg-mk-lavender">
                    Start free
                  </PillLink>
                ) : (
                  <span aria-disabled className="flex h-11 w-full items-center justify-center rounded-full text-[14.5px] font-medium opacity-50 ring-1 ring-mk-ink/20">
                    Coming soon
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
