import { AlertTriangle } from "lucide-react";
import { PageIntro } from "./page-intro";

export function LegalPage({
  title,
  updated,
  sections,
}: {
  title: string;
  updated: string;
  sections: { heading: string; body: string[] }[];
}) {
  return (
    <article className="mx-auto max-w-[760px] px-4 py-16 sm:px-6 sm:py-24">
      <PageIntro eyebrow={`Last updated ${updated}`} title={title} />
      <div className="mt-8 flex gap-3 rounded-2xl bg-amber-100 px-5 py-4 text-[14px] leading-relaxed text-amber-900" role="note">
        <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
        <p>
          <span className="font-semibold">Draft.</span> This document has not yet been reviewed by a lawyer and will be
          finalised before VibeShield leaves early access.
        </p>
      </div>
      <div className="mt-12 space-y-10">
        {sections.map((s) => (
          <section key={s.heading}>
            <h2 className="font-display text-[28px] leading-tight">{s.heading}</h2>
            <div className="mt-3 space-y-3 text-[15.5px] leading-relaxed opacity-80">
              {s.body.map((p) => <p key={p}>{p}</p>)}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
