import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind-aware className combiner. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Relative "time ago" for timestamps (ISO or epoch ms). */
export function timeAgo(input: string | number | Date): string {
  const then = new Date(input).getTime();
  if (Number.isNaN(then)) return "—";
  const diff = Date.now() - then;
  const abs = Math.abs(diff);
  const units: [number, Intl.RelativeTimeFormatUnit][] = [
    [60_000, "second"],
    [3_600_000, "minute"],
    [86_400_000, "hour"],
    [2_592_000_000, "day"],
    [31_536_000_000, "month"],
    [Infinity, "year"],
  ];
  const divisors = [1000, 60_000, 3_600_000, 86_400_000, 2_592_000_000, 31_536_000_000];
  for (let i = 0; i < units.length; i++) {
    if (abs < units[i][0]) {
      const value = Math.round(diff / divisors[i]);
      const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
      return rtf.format(-value, units[i][1]);
    }
  }
  return "—";
}

/** Compact absolute timestamp, e.g. "Apr 12, 09:45". */
export function formatTime(input: string | number | Date): string {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** mm:ss elapsed from a start timestamp to now (or an end). */
export function elapsed(startMs: number, endMs?: number): string {
  const ms = Math.max(0, (endMs ?? Date.now()) - startMs);
  const s = Math.floor(ms / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export function formatCurrency(n: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Deterministic pseudo-random in [0,1) from a string seed — stable demo data. */
export function seeded(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** 21ms → "21 ms", 1.4s → "1.4s", 92s → "92s". */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const s = ms / 1000;
  return s < 10 ? `${s.toFixed(1)}s` : `${Math.round(s)}s`;
}
