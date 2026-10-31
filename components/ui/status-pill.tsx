import { cn } from "@/lib/utils";
import type {
  ConnectionStatus,
  ScanStatus,
  SmokeStatus,
  DataOrigin,
} from "@/lib/types";

type Tone = "success" | "warning" | "critical" | "info" | "muted" | "brand";

const TONE_STYLES: Record<Tone, { dot: string; text: string; bg: string }> = {
  success: { dot: "bg-success", text: "text-success-ink", bg: "bg-success-soft" },
  warning: { dot: "bg-warning", text: "text-warning-ink", bg: "bg-warning-soft" },
  critical: { dot: "bg-critical", text: "text-critical-ink", bg: "bg-critical-soft" },
  info: { dot: "bg-brand", text: "text-brand-ink", bg: "bg-brand-soft" },
  brand: { dot: "bg-brand", text: "text-brand-ink", bg: "bg-brand-soft" },
  muted: { dot: "bg-faint", text: "text-muted", bg: "bg-surface-2" },
};

export function StatusPill({
  tone,
  label,
  pulse = false,
  solid = false,
  className,
}: {
  tone: Tone;
  label: string;
  pulse?: boolean;
  solid?: boolean;
  className?: string;
}) {
  const s = TONE_STYLES[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-medium",
        solid ? cn(s.bg, s.text) : "text-ink-2",
        className,
      )}
    >
      <span className="relative flex size-1.5">
        {pulse && (
          <span
            className={cn(
              "absolute inline-flex h-full w-full rounded-full opacity-60",
              s.dot,
            )}
            style={{ animation: "vs-ping 1.4s cubic-bezier(0,0,0.2,1) infinite" }}
          />
        )}
        <span className={cn("relative inline-flex size-1.5 rounded-full", s.dot)} />
      </span>
      {label}
    </span>
  );
}

// --- status → tone/label maps -----------------------------------------------

const CONNECTION: Record<ConnectionStatus, { tone: Tone; label: string }> = {
  connected: { tone: "success", label: "Connected" },
  disconnected: { tone: "muted", label: "Not connected" },
  error: { tone: "critical", label: "Error" },
  pending: { tone: "warning", label: "Pending" },
  expired: { tone: "warning", label: "Expired" },
  unauthorized: { tone: "critical", label: "Unauthorized" },
};

const SCAN: Record<ScanStatus, { tone: Tone; label: string; pulse?: boolean }> = {
  queued: { tone: "muted", label: "Queued" },
  running: { tone: "info", label: "Running", pulse: true },
  completed: { tone: "success", label: "Completed" },
  partial: { tone: "warning", label: "Partial" },
  failed: { tone: "critical", label: "Failed" },
  cancelled: { tone: "muted", label: "Cancelled" },
};

const SMOKE: Record<SmokeStatus, { tone: Tone; label: string; pulse?: boolean }> = {
  queued: { tone: "muted", label: "Queued" },
  starting: { tone: "info", label: "Starting", pulse: true },
  running: { tone: "info", label: "Running", pulse: true },
  passed: { tone: "success", label: "Passed" },
  failed: { tone: "critical", label: "Failed" },
  "timed-out": { tone: "warning", label: "Timed out" },
  unavailable: { tone: "muted", label: "Unavailable" },
};

const ORIGIN: Record<DataOrigin, { tone: Tone; label: string }> = {
  live: { tone: "success", label: "Live" },
  demo: { tone: "warning", label: "Demo data" },
  stale: { tone: "warning", label: "Stale" },
  unavailable: { tone: "muted", label: "Unavailable" },
};

export function ConnectionPill({ status, solid }: { status: ConnectionStatus; solid?: boolean }) {
  const c = CONNECTION[status];
  return <StatusPill tone={c.tone} label={c.label} solid={solid} />;
}
export function ScanPill({ status, solid }: { status: ScanStatus; solid?: boolean }) {
  const c = SCAN[status];
  return <StatusPill tone={c.tone} label={c.label} pulse={c.pulse} solid={solid} />;
}
export function SmokePill({ status, solid }: { status: SmokeStatus; solid?: boolean }) {
  const c = SMOKE[status];
  return <StatusPill tone={c.tone} label={c.label} pulse={c.pulse} solid={solid} />;
}
export function OriginPill({ origin, solid = true }: { origin: DataOrigin; solid?: boolean }) {
  const c = ORIGIN[origin];
  return <StatusPill tone={c.tone} label={c.label} solid={solid} />;
}
