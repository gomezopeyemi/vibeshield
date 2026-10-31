import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL } from "@/lib/marketing";
import type { CapabilityStatus } from "@/lib/types";

const TONE = { available: "success", preview: "warning", building: "muted" } as const;

export function StatusTag({ status }: { status: CapabilityStatus }) {
  return <Badge tone={TONE[status]} size="sm">{STATUS_LABEL[status]}</Badge>;
}
