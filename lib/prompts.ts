import type { AiTool, Finding } from "./types";

/* Generates a remediation prompt tailored to each AI development tool. The body
 * is built from the finding's real context (file, lines, snippet, fix); the
 * framing, constraints and validation steps differ per tool — not a name swap. */

interface ToolProfile {
  intro: (f: Finding) => string;
  constraints: string[];
  validation: string;
}

const COMMON_REGRESSION =
  "Do not weaken any other security control while fixing this. Keep existing functionality working.";

const TOOL_PROFILES: Record<AiTool, ToolProfile> = {
  cursor: {
    intro: () =>
      `You are editing this repository in Cursor. Use the codebase context to fix the following production-readiness issue. Make a minimal, surgical change and explain each edit in your summary.`,
    constraints: [
      "Edit only the files required for this fix; reference symbols by their real paths.",
      "Preserve the existing code style, imports and framework conventions.",
      COMMON_REGRESSION,
    ],
    validation:
      "After editing, run the type-checker and the app's tests, and confirm the issue is resolved before finishing.",
  },
  lovable: {
    intro: () =>
      `In Lovable, apply the following fix to the project. Keep the change scoped and preview it before publishing.`,
    constraints: [
      "Change only what is needed; keep the current UI and data flow intact.",
      "Keep secrets in server-side environment variables, never in client components.",
      COMMON_REGRESSION,
    ],
    validation:
      "Use Lovable's preview to verify the affected flow still works, then publish.",
  },
  bolt: {
    intro: () =>
      `In Bolt, implement the following fix. Apply it to the correct files and keep the dev server running cleanly.`,
    constraints: [
      "Make the smallest change that resolves the issue.",
      "Do not introduce new dependencies unless strictly required; prefer the stack already in use.",
      COMMON_REGRESSION,
    ],
    validation: "Confirm the terminal shows no new errors and the affected route loads.",
  },
  v0: {
    intro: () =>
      `In v0, generate the corrected code for the file below. Return the full updated file so it can be dropped in.`,
    constraints: [
      "Match the existing component API and styling.",
      "Keep server-only logic out of client components.",
      COMMON_REGRESSION,
    ],
    validation: "Ensure the generated file type-checks against the shown imports.",
  },
  windsurf: {
    intro: () =>
      `In Windsurf (Cascade), fix the following issue across the repository. Use repo context and keep edits minimal.`,
    constraints: [
      "Edit only the necessary files and keep conventions consistent.",
      "Never expose service-role credentials to the browser.",
      COMMON_REGRESSION,
    ],
    validation: "Run the project's checks and verify the fix before completing the flow.",
  },
  replit: {
    intro: () =>
      `In Replit, apply the following fix. Update the files and keep the repl running without new errors.`,
    constraints: [
      "Keep changes scoped; use Replit Secrets for any keys rather than inline values.",
      "Preserve existing behavior for all other routes.",
      COMMON_REGRESSION,
    ],
    validation: "Restart the repl and confirm the affected endpoint or screen works.",
  },
  "claude-code": {
    intro: () =>
      `You are Claude Code working in this repository. Resolve the following production-readiness issue with a minimal, well-explained change.`,
    constraints: [
      "Edit only the files required; follow the repo's existing conventions.",
      "Keep secrets server-side; never ship them in the client bundle.",
      COMMON_REGRESSION,
    ],
    validation:
      "Run the type-checker and tests, then summarize exactly what changed and why.",
  },
};

export function generateFixPrompt(finding: Finding, tool: AiTool): string {
  const p = TOOL_PROFILES[tool];
  const ctx = finding.context;
  const lines: string[] = [];

  lines.push(p.intro(finding));
  lines.push("");
  lines.push(`## Issue — ${finding.title} (${finding.severity})`);
  lines.push(finding.humanSummary);
  lines.push("");
  lines.push(`Why it matters: ${finding.businessImpact}`);
  lines.push("");

  if (finding.resource) lines.push(`Affected resource: ${finding.resource}`);
  if (ctx) {
    lines.push(
      `Location: ${ctx.path}${ctx.startLine ? `:${ctx.startLine}` : ""}`,
    );
    lines.push("");
    lines.push("Current code:");
    lines.push("```" + ctx.language);
    lines.push(ctx.snippet);
    lines.push("```");
    if (ctx.proposed) {
      lines.push("");
      lines.push("Intended result (adapt to the real file, don't paste blindly):");
      lines.push("```" + ctx.language);
      lines.push(ctx.proposed);
      lines.push("```");
    }
  }

  lines.push("");
  lines.push("## Required fix");
  lines.push(finding.recommendation);
  lines.push("");
  lines.push("## Constraints");
  p.constraints.forEach((c) => lines.push(`- ${c}`));
  lines.push("");
  lines.push("## Validation");
  lines.push(p.validation);

  return lines.join("\n");
}
