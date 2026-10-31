import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { PLANS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Pricing" };

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-[1120px] px-4 py-14 sm:px-6 sm:py-20">
      <h1 className="text-[32px] font-semibold tracking-tight text-ink sm:text-[40px]">Pricing</h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
        Start free. Paid plans unlock as their features ship.
      </p>

      <div className="mt-6 flex gap-2.5 rounded-[10px] border border-line bg-surface-2 px-4 py-3 text-[13px] leading-relaxed text-ink-2">
        <Icon name="Info" className="mt-0.5 size-4 shrink-0 text-brand" />
        <p>
          Billing isn&apos;t live yet. During early access every account is on the free plan, and several paid features
          are still in development — see <Link href="/features" className="font-medium text-brand underline-offset-2 hover:underline">Features</Link> for
          what works today.
        </p>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((p) => {
          const free = p.tier === "free";
          return (
            <div key={p.tier} className={cn("flex flex-col rounded-[14px] border bg-surface p-5", free ? "border-brand" : "border-line")}>
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-semibold text-ink">{p.name}</h2>
                {free && <Badge tone="brand" size="sm">Available now</Badge>}
              </div>
              <p className="mt-3 text-[26px] font-semibold tracking-tight text-ink">{p.priceLabel}</p>
              <p className="mt-1 text-[13px] text-muted">{p.tagline}</p>
              <ul className="mt-5 flex-1 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2 text-[13px] text-ink-2">
                    <Icon name="Check" className="mt-0.5 size-3.5 shrink-0 text-faint" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                {free ? (
                  <Button asChild variant="primary" className="w-full"><Link href="/signup">Start free</Link></Button>
                ) : (
                  <Button variant="secondary" className="w-full" disabled>Coming soon</Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
