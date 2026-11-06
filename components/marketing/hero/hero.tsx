import { BRAND, themeAttrs } from "@/lib/brand";
import { HeroDemo } from "./hero-demo";

/* Wavy dot texture. "static" tiles a pre-baked SVG (scripts/gen-hero-dots.mjs);
 * "filter" warps a CSS dot grid with feTurbulence live, which costs paint time. */
function DotTexture() {
  const fade = "[mask-image:linear-gradient(to_bottom,black_45%,transparent_92%)]";
  if (BRAND.heroTexture === "static") {
    return <div aria-hidden className={`absolute inset-0 -z-10 bg-[url(/marketing/hero-dots.svg)] opacity-35 ${fade}`} />;
  }
  return (
    <>
      <svg aria-hidden width="0" height="0" className="absolute">
        <filter id="mk-warp">
          <feTurbulence type="fractalNoise" baseFrequency="0.006" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="22" />
        </filter>
      </svg>
      <div
        aria-hidden
        className={`absolute inset-0 -z-10 bg-[radial-gradient(circle,white_1.1px,transparent_1.6px)] bg-[length:7px_7px] opacity-35 [filter:url(#mk-warp)] ${fade}`}
      />
    </>
  );
}

function BrowserFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/40 bg-mk-mock shadow-[0_40px_80px_-40px_rgb(31_1_61/0.45)]">
      <div className="flex h-10 items-center gap-1.5 px-4">
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-2.5 rounded-full bg-white/55" />
        ))}
        <span className="ml-auto text-[11px] font-medium uppercase tracking-[0.14em] text-mk-ink/55">Illustration</span>
      </div>
      {children}
    </div>
  );
}

export function Hero() {
  return (
    <section {...themeAttrs("hero")} data-page-theme="hero" aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      <DotTexture />
      <div className="mx-auto max-w-[1240px] px-4 pb-28 pt-16 text-center sm:px-6 sm:pt-24">
        <h1 id="hero-title" className="mx-auto max-w-[13ch] font-display text-[48px] leading-[1.02] tracking-[-0.015em] sm:text-[76px] lg:text-[92px]">
          {BRAND.headline}
        </h1>
        <p className="mx-auto mt-6 max-w-[36rem] text-[17px] leading-relaxed opacity-80 sm:text-[18.5px]">{BRAND.subhead}</p>

        <form
          action={BRAND.cta.href}
          method="get"
          className="mx-auto mt-9 flex w-full max-w-[460px] items-center gap-2 rounded-full bg-white p-1.5 pl-5 shadow-[0_8px_30px_-12px_rgb(31_1_61/0.35)] focus-within:ring-2 focus-within:ring-mk-cta"
        >
          <label htmlFor="hero-email" className="sr-only">Work email</label>
          <input
            id="hero-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="Work email"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-mk-ink outline-none placeholder:text-mk-ink/45"
          />
          <button
            type="submit"
            className="h-11 shrink-0 rounded-full bg-mk-cta px-5 text-[14.5px] font-medium text-white transition-colors hover:bg-[#3a0a63] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mk-cta"
          >
            {BRAND.cta.label}
          </button>
        </form>
        <p className="mt-3 text-[13px] opacity-70">{BRAND.ctaNote}</p>

        <div className="mx-auto mt-14 w-full sm:w-[86%] lg:w-[70%]">
          <BrowserFrame>
            <HeroDemo />
          </BrowserFrame>
        </div>
      </div>
    </section>
  );
}
