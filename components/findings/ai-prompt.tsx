"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { AiTool, Finding } from "@/lib/types";
import { AI_TOOLS, AI_TOOL_ORDER } from "@/lib/constants";
import { generateFixPrompt } from "@/lib/prompts";
import { BrandGlyph, type BrandName } from "@/components/ui/brand-glyph";
import { CopyButton } from "@/components/ui/copy-button";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export function AiPromptCustomizer({ finding }: { finding: Finding }) {
  const [tool, setTool] = useState<AiTool>("cursor");
  const generated = useMemo(() => generateFixPrompt(finding, tool), [finding, tool]);
  const [draft, setDraft] = useState(generated);
  const edited = draft !== generated;

  // Regenerate when the tool changes.
  useEffect(() => setDraft(generated), [generated]);

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-2 text-[12px] font-medium text-muted">Choose your AI tool</p>
        <div className="flex flex-wrap gap-1.5">
          {AI_TOOL_ORDER.map((t) => {
            const meta = AI_TOOLS[t];
            const active = tool === t;
            return (
              <button
                key={t}
                onClick={() => setTool(t)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-[8px] border px-2.5 py-1.5 text-[12.5px] font-medium transition-colors",
                  active
                    ? "border-brand bg-brand-soft text-brand-ink"
                    : "border-line-strong bg-surface text-ink-2 hover:bg-surface-2",
                )}
              >
                <BrandGlyph name={t as BrandName} size={14} />
                {meta.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="overflow-hidden rounded-[10px] border border-code-line bg-code-bg">
        <div className="flex items-center justify-between border-b border-code-line bg-code-bg-2 px-3 py-2">
          <div className="flex items-center gap-2 text-[12px] text-code-text">
            <Icon name="Sparkles" className="size-3.5 text-code-muted" />
            <span>Prompt for {AI_TOOLS[tool].label}</span>
            {edited && <span className="text-[11px] text-code-muted">· edited</span>}
          </div>
          <div className="flex items-center gap-1">
            {edited && (
              <button
                onClick={() => setDraft(generated)}
                className="inline-flex items-center gap-1 rounded-[6px] px-1.5 py-1 text-[11px] text-code-muted hover:text-code-text"
              >
                <Icon name="RotateCw" className="size-3" /> Regenerate
              </button>
            )}
            <CopyButton value={draft} className="text-code-muted hover:text-code-text" />
          </div>
        </div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          spellCheck={false}
          className="scroll-dark h-64 w-full resize-none bg-transparent px-3.5 py-3 font-mono text-[12px] leading-[1.6] text-code-text outline-none"
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-[11.5px] text-muted">
          Generated from this finding&apos;s real file path, code and fix — tailored to {AI_TOOLS[tool].label}.
        </p>
        <CopyButton value={draft} label={`Copy prompt`} />
      </div>
    </div>
  );
}
