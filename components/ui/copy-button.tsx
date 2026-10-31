"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";

export function CopyButton({
  value,
  label,
  className,
  size = 14,
}: {
  value: string;
  label?: string;
  className?: string;
  size?: number;
}) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Fallback for restricted clipboard contexts
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* no-op */
      }
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }, [value]);

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[6px] text-[12px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
        label
          ? "h-8 border border-line-strong bg-surface px-2.5 text-ink-2 hover:bg-surface-2"
          : "p-1 text-faint hover:text-ink",
        className,
      )}
      aria-label={copied ? "Copied" : label ? `Copy ${label}` : "Copy"}
    >
      {copied ? (
        <Check style={{ width: size, height: size }} className="text-success" />
      ) : (
        <Copy style={{ width: size, height: size }} />
      )}
      {label && <span>{copied ? "Copied" : label}</span>}
    </button>
  );
}
