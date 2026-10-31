"use client";

import { Highlight, type PrismTheme } from "prism-react-renderer";
import { cn } from "@/lib/utils";
import { Icon } from "./icon";
import { CopyButton } from "./copy-button";

/** Dark code surface theme tuned to VibeShield's restrained palette. */
export const vsCodeTheme: PrismTheme = {
  plain: { color: "#c9d3e3", backgroundColor: "transparent" },
  styles: [
    { types: ["comment", "prolog", "cdata"], style: { color: "#5a6680", fontStyle: "italic" } },
    { types: ["punctuation"], style: { color: "#8a94ab" } },
    { types: ["keyword", "operator", "boolean"], style: { color: "#8ab4ff" } },
    { types: ["function", "method"], style: { color: "#7ed0c0" } },
    { types: ["string", "char", "attr-value"], style: { color: "#9fd59a" } },
    { types: ["number", "constant", "symbol"], style: { color: "#e3b778" } },
    { types: ["tag", "selector"], style: { color: "#8ab4ff" } },
    { types: ["attr-name", "property"], style: { color: "#c9b6ff" } },
    { types: ["class-name", "maybe-class-name"], style: { color: "#e3b778" } },
    { types: ["variable"], style: { color: "#c9d3e3" } },
    { types: ["deleted"], style: { color: "#e59a93" } },
    { types: ["inserted"], style: { color: "#9fd59a" } },
  ],
};

export function CodeBlock({
  code,
  language = "tsx",
  startLine = 1,
  highlight = [],
  fileName,
  showCopy = true,
  maxHeight = 360,
  className,
}: {
  code: string;
  language?: string;
  startLine?: number;
  highlight?: number[]; // absolute line numbers to emphasize
  fileName?: string;
  showCopy?: boolean;
  maxHeight?: number;
  className?: string;
}) {
  const hl = new Set(highlight);
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[10px] border border-code-line bg-code-bg",
        className,
      )}
    >
      {fileName && (
        <div className="flex items-center justify-between border-b border-code-line bg-code-bg-2 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2 text-[12px] text-code-text">
            <Icon name="FileCode" className="size-3.5 shrink-0 text-code-muted" />
            <span className="truncate font-mono">{fileName}</span>
          </div>
          {showCopy && <CopyButton value={code} className="text-code-muted hover:text-code-text" />}
        </div>
      )}
      <div
        className="scroll-dark overflow-auto py-2 text-[12.5px] leading-[1.6] text-code-text"
        style={{ maxHeight }}
      >
        <Highlight code={code.replace(/\n$/, "")} language={language} theme={vsCodeTheme}>
          {({ tokens, getLineProps, getTokenProps }) => (
            <pre className="min-w-full font-mono">
              {tokens.map((line, i) => {
                const lineNo = startLine + i;
                const emphasized = hl.has(lineNo);
                const { key: _lk, ...lineProps } = getLineProps({ line });
                return (
                  <div
                    key={i}
                    {...lineProps}
                    className={cn(
                      "flex px-0",
                      emphasized && "bg-brand/10",
                    )}
                  >
                    <span className="sticky left-0 w-11 shrink-0 select-none bg-code-bg pr-3 text-right text-code-gutter">
                      {lineNo}
                    </span>
                    <span className="flex-1 pr-4">
                      {line.map((token, k) => {
                        const { key: _tk, ...tokenProps } = getTokenProps({ token });
                        return <span key={k} {...tokenProps} />;
                      })}
                    </span>
                  </div>
                );
              })}
            </pre>
          )}
        </Highlight>
      </div>
    </div>
  );
}
