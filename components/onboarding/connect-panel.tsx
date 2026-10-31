"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useSession } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { BrandGlyph } from "@/components/ui/brand-glyph";
import { ConnectionPill } from "@/components/ui/status-pill";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

function isValidUrl(v: string) {
  if (!v) return true;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function Step({ n, title, done, children }: { n: number; title: string; done?: boolean; children: React.ReactNode }) {
  return (
    <div className="relative pl-9">
      <span
        className={cn(
          "absolute left-0 top-0 flex size-6 items-center justify-center rounded-full text-[11px] font-semibold",
          done ? "bg-success text-white" : "bg-brand-soft text-brand-ink",
        )}
      >
        {done ? <Icon name="Check" className="size-3.5" /> : n}
      </span>
      <h3 className="mb-2 text-[13.5px] font-semibold text-ink">{title}</h3>
      {children}
    </div>
  );
}

export function ConnectPanel({
  onStart,
  scanning,
}: {
  onStart: () => void;
  scanning: boolean;
}) {
  const { repositories, repository, setRepository } = useSession();
  const connectedRepos = repositories.filter((r) => r.connection === "connected");
  const [repoId, setRepoId] = useState(repository?.id ?? connectedRepos[0]?.id ?? "");
  const repo = repositories.find((r) => r.id === repoId);

  const [liveUrl, setLiveUrl] = useState(repo?.liveUrl ?? "");
  const [stagingUrl, setStagingUrl] = useState(repo?.stagingUrl ?? "");
  const [env, setEnv] = useState("production");
  const [supabaseOpen, setSupabaseOpen] = useState(false);

  const liveValid = isValidUrl(liveUrl);
  const stagingValid = isValidUrl(stagingUrl);

  return (
    <div className="rounded-[12px] border border-line bg-surface p-5 shadow-[0_1px_3px_rgba(16,24,40,0.04)]">
      <h2 className="text-[15px] font-semibold text-ink">Connect your workspace</h2>
      <p className="mt-0.5 text-[12.5px] text-muted">
        Link your repository and application to start its first readiness scan.
      </p>

      <div className="mt-5 space-y-6">
        {/* Step 1 — GitHub */}
        <Step n={1} title="Connect repository" done>
          <div className="rounded-[10px] border border-line bg-surface-2/40 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BrandGlyph name="github" size={18} className="text-ink" />
                <span className="text-[13px] font-medium text-ink">GitHub</span>
              </div>
              <ConnectionPill status="connected" solid />
            </div>
            <div className="mt-3">
              <label className="mb-1 block text-[11.5px] font-medium text-muted">Repository</label>
              <Select value={repoId} onValueChange={(v) => { setRepoId(v); setRepository(v); const r = repositories.find((x) => x.id === v); setLiveUrl(r?.liveUrl ?? ""); setStagingUrl(r?.stagingUrl ?? ""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a repository" />
                </SelectTrigger>
                <SelectContent>
                  {connectedRepos.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {repo && (
                <div className="mt-2 flex items-center gap-3 text-[11.5px] text-muted">
                  <span className="inline-flex items-center gap-1"><Icon name="GitBranch" className="size-3.5" /> {repo.defaultBranch}</span>
                  <span className="inline-flex items-center gap-1"><Icon name={repo.private ? "Lock" : "Globe"} className="size-3.5" /> {repo.private ? "Private" : "Public"}</span>
                </div>
              )}
            </div>
          </div>
        </Step>

        {/* Step 2 — URLs */}
        <Step n={2} title="Configure application">
          <div className="space-y-2.5">
            <div>
              <label className="mb-1 block text-[11.5px] font-medium text-muted">Live URL</label>
              <Input
                icon="Globe"
                placeholder="https://your-app.com"
                value={liveUrl}
                invalid={!liveValid}
                onChange={(e) => setLiveUrl(e.target.value)}
                trailing={liveUrl && liveValid ? <Icon name="CheckCircle2" className="size-4 text-success" /> : undefined}
              />
              {!liveValid && <p className="mt-1 text-[11px] text-critical-ink">Enter a valid http(s) URL.</p>}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="mb-1 block text-[11.5px] font-medium text-muted">Staging URL (optional)</label>
                <Input icon="Globe" placeholder="https://staging…" value={stagingUrl} invalid={!stagingValid} onChange={(e) => setStagingUrl(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-[11.5px] font-medium text-muted">Environment</label>
                <Select value={env} onValueChange={setEnv}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="production">Production</SelectItem>
                    <SelectItem value="staging">Staging</SelectItem>
                    <SelectItem value="preview">Preview</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </Step>

        {/* Step 3 — Supabase optional */}
        <Step n={3} title="Connect Supabase (optional)">
          <div className="rounded-[10px] border border-line bg-surface-2/40 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BrandGlyph name="supabase" size={18} className="text-success" />
                <span className="text-[13px] font-medium text-ink">Supabase</span>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setSupabaseOpen((v) => !v)}>
                <Icon name="Plug" /> Connect Supabase
              </Button>
            </div>
            <p className="mt-2 text-[11.5px] text-muted">
              Enables table inspection and RLS policy analysis for the Security pillar.
            </p>
            {supabaseOpen && (
              <div className="mt-2 flex items-start gap-2 rounded-[8px] border border-line bg-surface px-2.5 py-2">
                <Icon name="Info" className="mt-0.5 size-3.5 shrink-0 text-muted" />
                <p className="text-[11.5px] text-muted">
                  Supabase OAuth is configured on the Integrations page. Connect it there to unlock live database inspection.
                </p>
              </div>
            )}
          </div>
        </Step>
      </div>

      {/* Start */}
      <div className="mt-6 border-t border-line pt-4">
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          disabled={!repoId || !liveValid || !stagingValid || scanning}
          onClick={onStart}
        >
          {scanning ? (
            <><Icon name="Loader2" className="animate-spin" /> Scanning…</>
          ) : (
            <><Icon name="Radar" /> Start Readiness Scan</>
          )}
        </Button>
        <div className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted">
          <Icon name="Info" className="mt-0.5 size-3 shrink-0" />
          <span>
            This environment can&apos;t reach your GitHub repo, so the real analyzer runs against the bundled{" "}
            <span className="font-medium text-ink">sample/vulnerable-app</span> target. Connect the GitHub App to
            scan your own repository.
          </span>
        </div>
      </div>
    </div>
  );
}
