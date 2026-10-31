"use client";

import { useEffect, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

function band(score: number) {
  if (score >= 80) return { stroke: "var(--success)", label: "Strong" };
  if (score >= 60) return { stroke: "var(--brand)", label: "Good progress" };
  if (score >= 40) return { stroke: "var(--warning)", label: "Needs work" };
  return { stroke: "var(--critical)", label: "At risk" };
}

export function ScoreRing({
  score,
  size = 150,
  stroke = 11,
  label,
  sublabel,
  className,
}: {
  score: number;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? score : 0);
  const [progress, setProgress] = useState(reduce ? score : 0);

  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const { stroke: color, label: bandLabel } = band(score);

  useEffect(() => {
    if (reduce) {
      setDisplay(score);
      setProgress(score);
      return;
    }
    const controls = animate(0, score, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        setDisplay(Math.round(v));
        setProgress(v);
      },
    });
    return () => controls.stop();
  }, [score, reduce]);

  const offset = circ - (progress / 100) * circ;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Launch readiness score ${score} of 100`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--surface-3)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[34px] font-semibold leading-none tracking-tight text-ink tabular">
          {display}
        </span>
        <span className="mt-0.5 text-[11px] font-medium text-faint">
          {label ?? "/ 100"}
        </span>
      </div>
      {sublabel !== undefined && (
        <span className="sr-only">{sublabel ?? bandLabel}</span>
      )}
    </div>
  );
}

export function scoreBandLabel(score: number) {
  return band(score).label;
}
