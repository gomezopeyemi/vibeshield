import type { Metadata } from "next";
import { Icon, type IconName } from "@/components/ui/icon";
import { StatusTag } from "@/components/marketing/status-tag";
import { PageIntro } from "@/components/marketing/page-intro";
import { PillLink } from "@/components/marketing/pill-link";
import { MODULES, STATUS_LABEL } from "@/lib/marketing";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: "Features" };

export default function FeaturesPage() {
  return (
    <div className="mx-auto max-w-[1240px] px-4 py-16 sm:px-6 sm:py-24">
      <PageIntro eyebrow="Features" title="Everything VibeShield checks">
        Exactly where each piece stands. <strong className="font-semibold">{STATUS_LABEL.available}</strong> works today;{" "}
        <strong className="font-semibold">{STATUS_LABEL.preview}</strong> shows the experience with sample data;{" "}
        <strong className="font-semibold">{STATUS_LABEL.building}</strong> isn&apos;t usable yet.
      </PageIntro>

      <div className="mt-14 space-y-5">
        {MODULES.map((m) => (
          <section key={m.key} id={m.key} className="scroll-mt-24 overflow-hidden rounded-2xl bg-white text-mk-ink ring-1 ring-mk-ink/8">
            <div className="flex items-start gap-4 border-b border-mk-ink/8 p-6">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-mk-lavender/45 text-mk-violet">
                <Icon name={m.icon as IconName} className="size-5" />
              </span>
              <div>
                <h2 className="font-display text-[30px] leading-none">{m.name}</h2>
                <p className="mt-1.5 text-[15px] opacity-70">{m.summary}</p>
              </div>
            </div>
            <ul>
              {m.capabilities.map((c) => (
                <li key={c.label} className="flex flex-col gap-2 border-b border-mk-ink/8 px-6 py-4 last:border-0 sm:flex-row sm:items-center sm:gap-6">
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-medium">{c.label}</p>
                    <p className="mt-0.5 text-[14px] leading-relaxed opacity-65">{c.detail}</p>
                  </div>
                  <StatusTag status={c.status} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-14 flex flex-wrap items-center gap-3">
        <PillLink href={BRAND.cta.href} arrow>{BRAND.cta.label}</PillLink>
        <PillLink href="/pricing" variant="outline">View pricing</PillLink>
      </div>
    </div>
  );
}
