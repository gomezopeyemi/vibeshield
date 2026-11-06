import { BUILT_FOR, themeAttrs } from "@/lib/brand";

export function BuiltFor() {
  return (
    <section id="built-for" {...themeAttrs("slate")} aria-labelledby="built-for-title" className="scroll-mt-24 py-24 sm:py-32">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
        <div className="text-center">
          <h2 id="built-for-title" className="mx-auto max-w-[16ch] font-display text-[40px] leading-[1.05] sm:text-[60px]">
            {BUILT_FOR.heading}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[17px] opacity-75">{BUILT_FOR.subhead}</p>
        </div>
        <ul className="mt-14 grid gap-4 md:grid-cols-3">
          {BUILT_FOR.cards.map((c) => (
            <li key={c.title} className="rounded-2xl bg-mk-lavender/12 p-5 ring-1 ring-white/12">
              <div className="grid aspect-[12/7] place-items-center overflow-hidden rounded-xl bg-mk-lavender p-6">
                {/* eslint-disable-next-line @next/next/no-img-element -- static SVG, nothing for next/image to optimise */}
                <img src={c.art} alt="" width={240} height={140} loading="lazy" className="h-full w-full object-contain" />
              </div>
              <h3 className="mt-5 font-display text-[30px] leading-none">{c.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed opacity-75">{c.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
