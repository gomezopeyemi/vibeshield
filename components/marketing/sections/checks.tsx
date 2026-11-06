import { CreditCard, Database, FileText, History, KeyRound, Lock, Repeat, type LucideIcon } from "lucide-react";
import { CHECKS, themeAttrs, type CheckIcon } from "@/lib/brand";
import { StatusTag } from "../status-tag";
import { PillLink } from "../pill-link";

const ICON: Record<CheckIcon, LucideIcon> = {
  key: KeyRound,
  database: Database,
  card: CreditCard,
  lock: Lock,
  loop: Repeat,
  file: FileText,
  history: History,
};

// Aligns the first card with the 1240px content column while the row runs to the viewport edge.
const GUTTER = "max(1rem, calc((100vw - 1240px) / 2 + 1.5rem))";

/** "What we check" carousel: snap-scrolling row, last card cropped at the edge to signal more. */
export function Checks() {
  return (
    <section id="checks" {...themeAttrs("lavender")} aria-labelledby="checks-title" className="scroll-mt-24 py-24 sm:py-28">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
        <h2 id="checks-title" className="max-w-[16ch] font-display text-[40px] leading-[1.05] sm:text-[60px]">
          What VibeShield checks
        </h2>
        <p className="mt-4 max-w-xl text-[17px] opacity-75">Each check says where it stands today. Nothing is called available until it works for your account.</p>
      </div>

      <ul
        tabIndex={0}
        aria-label="Checks"
        className="mk-no-scrollbar mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 pr-4 outline-none focus-visible:ring-2 focus-visible:ring-mk-violet"
        style={{ paddingLeft: GUTTER, scrollPaddingLeft: GUTTER }}
      >
        {CHECKS.map((c) => {
          const Glyph = ICON[c.icon];
          return (
            <li key={c.title} className="flex h-[260px] w-[200px] shrink-0 snap-start flex-col justify-between rounded-2xl bg-mk-card p-5 text-mk-ink">
              <Glyph aria-hidden className="size-10" strokeWidth={1.1} />
              <div>
                <h3 className="font-display text-[26px] leading-[1.05]">{c.title}</h3>
                <p className="mt-2 text-[13.5px] leading-snug opacity-70">{c.subtitle}</p>
                <StatusTag status={c.status} className="mt-3" />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mx-auto mt-10 max-w-[1240px] px-4 sm:px-6">
        <PillLink href="/features" arrow>Explore all checks</PillLink>
      </div>
    </section>
  );
}
