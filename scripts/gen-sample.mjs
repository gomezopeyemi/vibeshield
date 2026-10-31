// Generates the intentionally-oversized sample file used by the scanner's
// "monolith" rule. Runs before every build so it doesn't need to be committed.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const out = "samples/vulnerable-app/src/app/dashboard/page.tsx";
const lines = [
  '"use client";',
  'import { useState } from "react";',
  "",
  "// NOTE: this file has grown far beyond a maintainable size.",
  "export default function DashboardPage() {",
  '  const [tab, setTab] = useState("overview");',
  ...Array.from({ length: 2460 }, (_, i) => `  const v${i + 1} = ${i + 1}; // widget row ${i + 1}`),
  "  return <div>{tab}{v1}{v2460}</div>;",
  "}",
];
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, lines.join("\n") + "\n");
console.log(`generated ${out} (${lines.length} lines)`);
