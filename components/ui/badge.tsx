import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "border-line bg-surface-2 text-ink-2",
        brand: "border-brand-soft-2 bg-brand-soft text-brand-ink",
        success: "border-success-soft bg-success-soft text-success-ink",
        warning: "border-warning-soft bg-warning-soft text-warning-ink",
        critical: "border-critical-soft bg-critical-soft text-critical-ink",
        info: "border-brand-soft-2 bg-brand-soft text-brand-ink",
        outline: "border-line-strong bg-transparent text-muted",
        muted: "border-transparent bg-surface-2 text-muted",
      },
      size: {
        sm: "px-1.5 py-0.5 text-[10.5px] leading-none",
        md: "px-2 py-0.5 text-[11.5px] leading-tight",
        lg: "px-2.5 py-1 text-xs",
      },
    },
    defaultVariants: { tone: "neutral", size: "md" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, size, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone, size }), className)} {...props} />
  );
}
