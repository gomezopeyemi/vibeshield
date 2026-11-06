/** Title block for inner marketing pages (features, pricing, legal). */
export function PageIntro({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <header className="max-w-3xl">
      {eyebrow && <p className="text-[12px] font-medium uppercase tracking-[0.16em] opacity-55">{eyebrow}</p>}
      <h1 className="mt-3 font-display text-[48px] leading-[1.02] tracking-[-0.01em] sm:text-[72px]">{title}</h1>
      {children && <div className="mt-5 max-w-2xl text-[17px] leading-relaxed opacity-75">{children}</div>}
    </header>
  );
}
