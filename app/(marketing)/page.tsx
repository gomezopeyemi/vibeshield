import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icon, type IconName } from "@/components/ui/icon";
import { StatusTag } from "@/components/marketing/status-tag";
import { LOOP, MODULES } from "@/lib/marketing";
import { APP_TAGLINE } from "@/lib/constants";

const TOOLS = ["Cursor", "Lovable", "Bolt", "v0", "Windsurf", "Replit", "Claude Code"];

export default function LandingPage() {
  const available = MODULES.flatMap((m) => m.capabilities.filter((c) => c.status === "available"));

  return (
    <>
      <section className="mx-auto max-w-[1120px] px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
        <Badge tone="brand" size="md">Early access · free while we build</Badge>
        <h1 className="mt-5 max-w-3xl text-[36px] font-semibold leading-[1.1] tracking-tight text-ink sm:text-[52px]">
          {APP_TAGLINE}
        </h1>
        <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-muted sm:text-[17px]">
          VibeShield checks apps built with AI coding tools for the security, cost and reliability problems they
          tend to leave behind, explains each one in plain English, and hands you a prompt to fix it.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild variant="primary" size="lg"><Link href="/signup">Start free <Icon name="ArrowRight" /></Link></Button>
          <Button asChild variant="secondary" size="lg"><Link href="/features">See what works today</Link></Button>
        </div>
        <p className="mt-8 text-[12.5px] text-faint">Built for apps made with {TOOLS.join(" · ")}</p>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-[1120px] px-4 py-14 sm:px-6">
          <h2 className="text-[22px] font-semibold tracking-tight text-ink">From prompt to production, step by step</h2>
          <p className="mt-2 max-w-2xl text-[14px] text-muted">
            Each step is labelled with where it stands today. We only call something available when it works for your account.
          </p>
          <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {LOOP.map((s, i) => (
              <li key={s.step} className="rounded-[12px] border border-line bg-canvas p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-medium tabular text-faint">0{i + 1}</span>
                  <StatusTag status={s.status} />
                </div>
                <p className="mt-2 text-[15px] font-semibold text-ink">{s.step}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">{s.detail}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-[1120px] px-4 py-14 sm:px-6">
        <h2 className="text-[22px] font-semibold tracking-tight text-ink">What a scan looks for today</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {available.map((c) => (
            <li key={c.label} className="flex gap-3 rounded-[12px] border border-line bg-surface p-4">
              <Icon name="Check" className="mt-0.5 size-4 shrink-0 text-success" />
              <div>
                <p className="text-[14px] font-medium text-ink">{c.label}</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{c.detail}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex gap-2.5 rounded-[10px] border border-line bg-surface-2 px-4 py-3 text-[13px] leading-relaxed text-ink-2">
          <Icon name="Info" className="mt-0.5 size-4 shrink-0 text-brand" />
          <p>
            Right now scans run against a sample app so you can see the whole flow end to end. Connecting your own
            GitHub repository is the next thing we&apos;re shipping.
          </p>
        </div>
      </section>

      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-[1120px] px-4 py-14 sm:px-6">
          <h2 className="text-[22px] font-semibold tracking-tight text-ink">Five areas, one readiness score</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {MODULES.map((m) => (
              <Link key={m.key} href={`/features#${m.key}`} className="rounded-[12px] border border-line bg-canvas p-4 transition-colors hover:border-line-strong">
                <Icon name={m.icon as IconName} className="size-5 text-brand" />
                <p className="mt-3 text-[14px] font-semibold text-ink">{m.name}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{m.summary}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1120px] px-4 py-16 text-center sm:px-6">
        <h2 className="text-[26px] font-semibold tracking-tight text-ink">See your launch readiness score</h2>
        <p className="mx-auto mt-2 max-w-xl text-[14px] text-muted">Free during early access. No card needed.</p>
        <Button asChild variant="primary" size="lg" className="mt-6"><Link href="/signup">Create your account</Link></Button>
      </section>
    </>
  );
}
