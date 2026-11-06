import { HOW_IT_WORKS, themeAttrs } from "@/lib/brand";
import { LOOP } from "@/lib/marketing";
import { StatusTag } from "../status-tag";

/** The product loop, straight from lib/marketing.ts so each step's status stays true. */
export function HowItWorks() {
  return (
    <section {...themeAttrs("offwhite")} aria-labelledby="how-title" className="mx-auto max-w-[1240px] px-4 pb-24 sm:px-6 sm:pb-32">
      <div className="grid gap-6 md:grid-cols-[1fr_1.4fr] md:items-end">
        <h2 id="how-title" className="max-w-[12ch] font-display text-[40px] leading-[1.05] sm:text-[60px]">
          {HOW_IT_WORKS.heading}
        </h2>
        <p className="max-w-md text-[17px] opacity-70 md:justify-self-end">{HOW_IT_WORKS.subhead}</p>
      </div>

      <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LOOP.map((s, i) => (
          <li key={s.step} className="rounded-2xl bg-white p-6 ring-1 ring-mk-ink/8">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-display text-[44px] leading-none opacity-30">{String(i + 1).padStart(2, "0")}</span>
              <StatusTag status={s.status} />
            </div>
            <h3 className="mt-5 font-display text-[30px] leading-none">{s.step}</h3>
            <p className="mt-2 max-w-xs text-[15px] leading-relaxed opacity-70">{s.detail}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
