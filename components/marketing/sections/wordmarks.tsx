import { cn } from "@/lib/utils";
import { WORDMARKS, WORDMARK_LABEL } from "@/lib/brand";

const STYLE = {
  sans: "font-mk font-semibold tracking-[-0.02em]",
  serif: "font-display text-[1.3em] leading-none",
  mono: "font-mono font-medium tracking-tight",
  round: "font-mk font-extrabold tracking-[-0.04em]",
} as const;

/** Neutral text wordmarks: names of tools VibeShield supports, not endorsements. */
export function WordmarkRow({ part, className }: { part: 0 | 1; className?: string }) {
  const items = WORDMARKS.slice(part * 6, part * 6 + 6);
  return (
    <ul className={cn("mx-auto grid max-w-[1100px] grid-cols-3 items-center justify-items-center gap-x-4 gap-y-5 px-4 sm:grid-cols-6 sm:px-6", className)}>
      {items.map((w) => (
        <li key={w.name} className={cn("flex items-center gap-2 whitespace-nowrap text-[18px] opacity-55 sm:text-[20px]", STYLE[w.style])}>
          {w.logo && (
            // Masked so the logo takes the text colour (and the page's colour transitions).
            <span
              aria-hidden
              className="size-[0.95em] shrink-0 bg-current"
              style={{ mask: `url(/marketing/logos/${w.logo}.svg) center / contain no-repeat` }}
            />
          )}
          {w.name}
        </li>
      ))}
    </ul>
  );
}

export function WordmarkLabel() {
  return (
    <p className="px-4 text-center text-[12px] font-medium uppercase tracking-[0.16em] opacity-60">{WORDMARK_LABEL}</p>
  );
}
