"use client";

import { useId, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/utils";

export interface Point {
  at: string;
  score: number;
}

/** Single-series readiness-history chart. One hue (brand), recessive grid,
 * direct-labelled endpoint, crosshair + tooltip on hover. */
export function LineChart({
  data,
  height = 120,
  min = 0,
  max = 100,
  className,
}: {
  data: Point[];
  height?: number;
  min?: number;
  max?: number;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);
  const W = 100; // viewBox width units (percentage-like)
  const padY = 8;

  const pts = useMemo(() => {
    if (data.length === 0) return [];
    const span = Math.max(1, data.length - 1);
    return data.map((d, i) => {
      const x = (i / span) * W;
      const norm = (d.score - min) / Math.max(1, max - min);
      const y = padY + (1 - norm) * (height - padY * 2);
      return { x, y, ...d };
    });
  }, [data, height, min, max]);

  if (pts.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-[8px] bg-surface-2 text-[12px] text-faint",
          className,
        )}
        style={{ height }}
      >
        No history yet
      </div>
    );
  }

  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const area = `${line} L${pts[pts.length - 1].x},${height} L${pts[0].x},${height} Z`;
  const active = hover !== null ? pts[hover] : null;
  const last = pts[pts.length - 1];

  return (
    <div className={cn("relative", className)} style={{ height }}>
      <svg
        viewBox={`0 0 ${W} ${height}`}
        preserveAspectRatio="none"
        className="h-full w-full overflow-visible"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const rel = ((e.clientX - rect.left) / rect.width) * W;
          let nearest = 0;
          let best = Infinity;
          pts.forEach((p, i) => {
            const d = Math.abs(p.x - rel);
            if (d < best) {
              best = d;
              nearest = i;
            }
          });
          setHover(nearest);
        }}
      >
        <defs>
          <linearGradient id={`g-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* recessive gridlines */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1="0"
            x2={W}
            y1={padY + f * (height - padY * 2)}
            y2={padY + f * (height - padY * 2)}
            stroke="var(--line)"
            strokeWidth="0.5"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <path d={area} fill={`url(#g-${uid})`} />
        <path
          d={line}
          fill="none"
          stroke="var(--brand)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {active && (
          <line
            x1={active.x}
            x2={active.x}
            y1={0}
            y2={height}
            stroke="var(--brand)"
            strokeWidth="1"
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
          />
        )}
        <circle
          cx={last.x}
          cy={last.y}
          r="3"
          fill="var(--brand)"
          stroke="var(--surface)"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
        {active && hover !== pts.length - 1 && (
          <circle
            cx={active.x}
            cy={active.y}
            r="3"
            fill="var(--brand)"
            stroke="var(--surface)"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      {active && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-[7px] border border-line bg-surface px-2 py-1 text-[11px] shadow-[0_8px_24px_-6px_rgba(16,24,40,0.2)]"
          style={{
            left: `${active.x}%`,
            top: `${(active.y / height) * 100}%`,
            marginTop: -8,
          }}
        >
          <div className="font-semibold text-ink tabular">{active.score}</div>
          <div className="text-faint">{formatTime(active.at)}</div>
        </div>
      )}
    </div>
  );
}
