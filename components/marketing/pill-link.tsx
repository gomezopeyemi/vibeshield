import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const VARIANT = {
  violet: "bg-mk-violet text-white hover:bg-[#4a00a6]",
  dark: "bg-mk-cta text-white hover:bg-[#3a0a63]",
  outline: "border border-current/25 hover:border-current/50",
} as const;

const CHIP = {
  violet: "bg-white text-mk-violet",
  dark: "bg-white text-mk-cta",
  outline: "bg-mk-ink text-white",
} as const;

export const pillClass = (variant: keyof typeof VARIANT, className?: string) =>
  cn(
    "inline-flex h-11 items-center gap-2.5 rounded-full px-5 text-[14.5px] font-medium transition-colors",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mk-violet",
    VARIANT[variant],
    className,
  );

/** Pill CTA; `arrow` adds the round arrow chip. */
export function PillLink({
  href,
  children,
  variant = "violet",
  arrow = false,
  className,
}: {
  href: string;
  children: React.ReactNode;
  variant?: keyof typeof VARIANT;
  arrow?: boolean;
  className?: string;
}) {
  return (
    <Link href={href} className={pillClass(variant, cn(arrow && "pr-1.5", className))}>
      {children}
      {arrow && <ArrowChip variant={variant} />}
    </Link>
  );
}

export function ArrowChip({ variant }: { variant: keyof typeof VARIANT }) {
  return (
    <span aria-hidden className={cn("grid size-8 place-items-center rounded-full", CHIP[variant])}>
      <ArrowRight className="size-4" strokeWidth={2} />
    </span>
  );
}
