import { BRAND, FINAL_CTA, themeAttrs } from "@/lib/brand";
import { PillLink } from "../pill-link";

export function FinalCta() {
  return (
    <section {...themeAttrs("offwhite")} aria-labelledby="final-cta-title" className="mx-auto max-w-[1240px] px-4 py-24 sm:px-6 sm:py-32">
      <div className="grid items-center gap-12 md:grid-cols-2">
        <div>
          <h2 id="final-cta-title" className="max-w-[10ch] font-display text-[56px] leading-[0.95] tracking-[-0.015em] sm:text-[88px]">
            {FINAL_CTA.heading}
          </h2>
          <PillLink href={BRAND.cta.href} arrow className="mt-9">{BRAND.cta.label}</PillLink>
        </div>
        <div className="flex justify-center md:justify-end">
          <div className="grid aspect-square w-full max-w-[460px] place-items-center rounded-full bg-mk-lavender/45 p-[16%]">
            {/* eslint-disable-next-line @next/next/no-img-element -- static SVG */}
            <img src={FINAL_CTA.art} alt="" width={360} height={300} loading="lazy" className="h-full w-full object-contain" />
          </div>
        </div>
      </div>
    </section>
  );
}
