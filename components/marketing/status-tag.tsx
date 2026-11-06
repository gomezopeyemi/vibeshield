import { cn } from "@/lib/utils";
import { STATUS_LABEL } from "@/lib/marketing";
import type { CapabilityStatus } from "@/lib/types";

const TONE: Record<CapabilityStatus, string> = {
  available: "bg-mk-green/12 text-mk-green",
  preview: "bg-amber-400/20 text-amber-800",
  building: "bg-mk-ink/8 text-mk-ink/70",
};

/** Capability status chip for the marketing site. */
export function StatusTag({ status, className }: { status: CapabilityStatus; className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-medium", TONE[status], className)}>
      {STATUS_LABEL[status]}
    </span>
  );
}
