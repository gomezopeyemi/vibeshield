import { Badge } from "./badge";
import { SEVERITY } from "@/lib/constants";
import type { Severity } from "@/lib/types";

export function SeverityBadge({ severity, size = "md" }: { severity: Severity; size?: "sm" | "md" | "lg" }) {
  const meta = SEVERITY[severity];
  return (
    <Badge tone={meta.tone} size={size}>
      {meta.label}
    </Badge>
  );
}

export function SeverityDot({ severity }: { severity: Severity }) {
  const tone = SEVERITY[severity].tone;
  const color =
    tone === "critical"
      ? "bg-critical"
      : tone === "warning"
        ? "bg-warning"
        : tone === "info"
          ? "bg-brand"
          : tone === "success"
            ? "bg-success"
            : "bg-faint";
  return <span className={`inline-block size-2 rounded-full ${color}`} />;
}
