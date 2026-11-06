import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

/** Placeholder brand mark: a simple shield shape, no third-party artwork. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("size-5", className)}>
      <path d="M12 2.5 4 5.6v6.1c0 4.7 3.3 8.6 8 9.8 4.7-1.2 8-5.1 8-9.8V5.6L12 2.5Z" fill="currentColor" />
      <path d="m8.6 12.2 2.4 2.4 4.6-4.9" fill="none" stroke="var(--mk-lavender)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Square avatar used where VibeShield "speaks" in product mocks. */
export function BrandAvatar({ className }: { className?: string }) {
  return (
    <span className={cn("grid size-8 shrink-0 place-items-center rounded-[9px] bg-mk-cta text-white", className)}>
      <BrandMark className="size-[18px]" />
    </span>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return <span className={cn("font-display text-[26px] leading-none tracking-tight", className)}>{BRAND.name}</span>;
}
