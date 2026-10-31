import "server-only";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

/* A "source" is a set of real files to scan. The local provider reads them from
 * disk (used now, against the bundled sample target). The GitHub provider is the
 * production path — it reads a connected repository's files. */

export interface FileEntry {
  path: string; // logical repo-relative path, e.g. "src/lib/supabaseClient.ts"
  content: string;
  lines: number;
}

export interface SourceInfo {
  id: string;
  label: string; // owner/name shown in the UI
  kind: "sample" | "local" | "github";
  branch: string;
  commit?: string;
}

export interface RepoSource {
  info: SourceInfo;
  load: () => Promise<FileEntry[]>;
}

const SCAN_EXTS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".sql", ".json", ".md", ".env",
]);
const SPECIAL_NAMES = new Set([".cursorrules", ".windsurfrules"]);
const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "dist", "build", "out", ".turbo"]);
const MAX_FILE_BYTES = 400_000;
const MAX_FILES = 600;

function wanted(name: string): boolean {
  if (SPECIAL_NAMES.has(name)) return true;
  if (name.startsWith(".env")) return true;
  return SCAN_EXTS.has(path.extname(name));
}

async function walk(dir: string, rootLen: number, acc: FileEntry[]): Promise<void> {
  if (acc.length >= MAX_FILES) return;
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (acc.length >= MAX_FILES) return;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      await walk(full, rootLen, acc);
    } else if (e.isFile() && wanted(e.name)) {
      try {
        const info = await stat(full);
        if (info.size > MAX_FILE_BYTES) {
          // Still record it (size matters for monolith checks) but cap content.
          const content = (await readFile(full, "utf8")).slice(0, MAX_FILE_BYTES);
          acc.push({ path: full.slice(rootLen), content, lines: content.split("\n").length });
          continue;
        }
        const content = await readFile(full, "utf8");
        acc.push({
          path: full.slice(rootLen).replace(/^[/\\]/, ""),
          content,
          lines: content.split("\n").length,
        });
      } catch {
        /* unreadable — skip */
      }
    }
  }
}

/** Read a real directory on disk as a scan source. */
export function localSource(rootDir: string, info: Omit<SourceInfo, "kind">): RepoSource {
  const normalizedRoot = rootDir.endsWith(path.sep) ? rootDir : rootDir + path.sep;
  return {
    info: { ...info, kind: "local" },
    load: async () => {
      const acc: FileEntry[] = [];
      await walk(rootDir, normalizedRoot.length, acc);
      return acc;
    },
  };
}

/** The bundled, intentionally-vulnerable sample app (real files on disk). */
export function sampleSource(): RepoSource {
  const dir = path.join(process.cwd(), "samples", "vulnerable-app");
  const src = localSource(dir, {
    id: "sample_vulnerable",
    label: "sample/vulnerable-app",
    branch: "main",
    commit: "local",
  });
  src.info.kind = "sample";
  return src;
}

/* Production path: read a connected GitHub repository's files via the GitHub
 * API or a checkout. Not reachable in this sandbox (the gateway blocks
 * api.github.com and repo access is brokered per-repo), so it fails honestly. */
export function githubSource(fullName: string, branch: string): RepoSource {
  return {
    info: { id: `gh_${fullName}`, label: fullName, kind: "github", branch },
    load: async () => {
      throw new Error(
        "GitHub source not reachable: connect the GitHub App (and, in restricted environments, attach the repository) to scan a real repository.",
      );
    },
  };
}
