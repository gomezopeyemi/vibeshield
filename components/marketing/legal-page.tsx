import { Icon } from "@/components/ui/icon";

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
    <article className="mx-auto max-w-[720px] px-4 py-14 sm:px-6 sm:py-20">
      <h1 className="text-[32px] font-semibold tracking-tight text-ink">{title}</h1>
      <p className="mt-2 text-[13px] text-faint">Last updated {updated}</p>
      <div className="mt-6 flex gap-2.5 rounded-[10px] border border-warning-soft bg-warning-soft px-4 py-3 text-[13px] leading-relaxed text-warning-ink" role="note">
        <Icon name="AlertTriangle" className="mt-0.5 size-4 shrink-0" />
        <p>
          <span className="font-semibold">Draft.</span> This document has not yet been reviewed by a lawyer and will be
          finalised before VibeShield leaves early access.
        </p>
      </div>
      <div className="mt-10 space-y-8">
        {sections.map((s) => (
          <section key={s.heading}>
            <h2 className="text-[17px] font-semibold text-ink">{s.heading}</h2>
            <div className="mt-2 space-y-3 text-[14px] leading-relaxed text-ink-2">
              {s.body.map((p) => <p key={p}>{p}</p>)}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
