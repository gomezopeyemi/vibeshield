"use client";

import { useMemo, useState } from "react";
import { Highlight } from "prism-react-renderer";
import { cn } from "@/lib/utils";
import { vsCodeTheme } from "./code-block";
import { Icon } from "./icon";
import { CopyButton } from "./copy-button";

type Row =
  | { type: "ctx"; oldNo: number; newNo: number; text: string }
  | { type: "del"; oldNo: number; text: string }
  | { type: "add"; newNo: number; text: string };

/** Line-level LCS diff of two source strings. */
function computeDiff(original: string, proposed: string): Row[] {
  const a = original.replace(/\n$/, "").split("\n");
  const b = proposed.replace(/\n$/, "").split("\n");
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const rows: Row[] = [];
  let i = 0;
  let j = 0;
  let oldNo = 1;
  let newNo = 1;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      rows.push({ type: "ctx", oldNo: oldNo++, newNo: newNo++, text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      rows.push({ type: "del", oldNo: oldNo++, text: a[i] });
      i++;
    } else {
      rows.push({ type: "add", newNo: newNo++, text: b[j] });
      j++;
    }
  }
  while (i < n) rows.push({ type: "del", oldNo: oldNo++, text: a[i++] });
  while (j < m) rows.push({ type: "add", newNo: newNo++, text: b[j++] });
  return rows;
}

function Code({ text, language }: { text: string; language: string }) {
  return (
    <Highlight code={text || " "} language={language} theme={vsCodeTheme}>
      {({ tokens, getTokenProps }) => (
        <>
          {tokens[0]?.map((token, k) => {
            const { key: _k, ...rest } = getTokenProps({ token });
            return <span key={k} {...rest} />;
          })}
        </>
      )}
    </Highlight>
  );
}

export function DiffView({
  original,
  proposed,
  language = "tsx",
  fileName,
  defaultView = "unified",
  className,
}: {
  original: string;
  proposed: string;
  language?: string;
  fileName?: string;
  defaultView?: "unified" | "split";
  className?: string;
}) {
  const [view, setView] = useState<"unified" | "split">(defaultView);
  const rows = useMemo(() => computeDiff(original, proposed), [original, proposed]);
  const added = rows.filter((r) => r.type === "add").length;
  const removed = rows.filter((r) => r.type === "del").length;

  return (
    <div className={cn("overflow-hidden rounded-[10px] border border-code-line bg-code-bg", className)}>
      <div className="flex items-center justify-between gap-2 border-b border-code-line bg-code-bg-2 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2 text-[12px] text-code-text">
          <Icon name="FileCode" className="size-3.5 shrink-0 text-code-muted" />
          <span className="truncate font-mono">{fileName ?? "diff"}</span>
          <span className="ml-1 font-mono text-[11px] text-[#9fd59a]">+{added}</span>
          <span className="font-mono text-[11px] text-[#e59a93]">−{removed}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="flex rounded-[6px] border border-code-line p-0.5">
            {(["unified", "split"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "rounded-[4px] px-1.5 py-0.5 text-[11px] font-medium capitalize transition-colors",
                  view === v ? "bg-code-line text-code-text" : "text-code-muted hover:text-code-text",
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <CopyButton value={proposed} className="text-code-muted hover:text-code-text" />
        </div>
      </div>

      <div className="scroll-dark overflow-auto font-mono text-[12.5px] leading-[1.6] text-code-text" style={{ maxHeight: 420 }}>
        {view === "unified" ? (
          <table className="w-full border-collapse">
            <tbody>
              {rows.map((r, idx) => (
                <tr
                  key={idx}
                  className={cn(
                    r.type === "add" && "bg-[#1a2e22]",
                    r.type === "del" && "bg-[#331f1d]",
                  )}
                >
                  <td className="w-10 select-none border-r border-code-line/60 px-2 text-right text-code-gutter">
                    {r.type !== "add" ? r.oldNo : ""}
                  </td>
                  <td className="w-10 select-none border-r border-code-line/60 px-2 text-right text-code-gutter">
                    {r.type !== "del" ? r.newNo : ""}
                  </td>
                  <td className="w-5 select-none pl-2 pr-1 text-center">
                    <span
                      className={cn(
                        r.type === "add" && "text-[#9fd59a]",
                        r.type === "del" && "text-[#e59a93]",
                        r.type === "ctx" && "text-code-gutter",
                      )}
                    >
                      {r.type === "add" ? "+" : r.type === "del" ? "−" : ""}
                    </span>
                  </td>
                  <td className="w-full whitespace-pre pr-4">
                    <Code text={r.text} language={language} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <SplitView rows={rows} language={language} />
        )}
      </div>
    </div>
  );
}

function SplitView({ rows, language }: { rows: Row[]; language: string }) {
  // Pair deletions with additions for aligned side-by-side rendering.
  const left: (Row | null)[] = [];
  const right: (Row | null)[] = [];
  let i = 0;
  while (i < rows.length) {
    const r = rows[i];
    if (r.type === "ctx") {
      left.push(r);
      right.push(r);
      i++;
    } else {
      const dels: Row[] = [];
      const adds: Row[] = [];
      while (i < rows.length && rows[i].type === "del") dels.push(rows[i++]);
      while (i < rows.length && rows[i].type === "add") adds.push(rows[i++]);
      const max = Math.max(dels.length, adds.length);
      for (let k = 0; k < max; k++) {
        left.push(dels[k] ?? null);
        right.push(adds[k] ?? null);
      }
    }
  }
  return (
    <div className="grid grid-cols-2">
      <div className="border-r border-code-line/60">
        {left.map((r, idx) => (
          <div
            key={idx}
            className={cn("flex", r?.type === "del" && "bg-[#331f1d]")}
          >
            <span className="w-10 shrink-0 select-none px-2 text-right text-code-gutter">
              {r && r.type !== "add" ? (r as { oldNo?: number }).oldNo : ""}
            </span>
            <span className="min-w-0 flex-1 whitespace-pre pr-3">
              {r && <Code text={r.text} language={language} />}
            </span>
          </div>
        ))}
      </div>
      <div>
        {right.map((r, idx) => (
          <div
            key={idx}
            className={cn("flex", r?.type === "add" && "bg-[#1a2e22]")}
          >
            <span className="w-10 shrink-0 select-none px-2 text-right text-code-gutter">
              {r && r.type !== "del" ? (r as { newNo?: number }).newNo : ""}
            </span>
            <span className="min-w-0 flex-1 whitespace-pre pr-3">
              {r && <Code text={r.text} language={language} />}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
