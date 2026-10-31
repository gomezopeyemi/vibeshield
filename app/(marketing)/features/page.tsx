import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { StatusTag } from "@/components/marketing/status-tag";
import { MODULES, STATUS_LABEL } from "@/lib/marketing";

export const metadata: Metadata = { title: "Features" };

export default function FeaturesPage() {
  return (
    <div className="mx-auto max-w-[1120px] px-4 py-14 sm:px-6 sm:py-20">
      <h1 className="text-[32px] font-semibold tracking-tight text-ink sm:text-[40px]">Features</h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
        Everything VibeShield checks, and exactly where each piece stands. <strong className="font-medium text-ink-2">{STATUS_LABEL.available}</strong>{" "}
        works today; <strong className="font-medium text-ink-2">{STATUS_LABEL.preview}</strong> shows the experience with sample data;{" "}
        <strong className="font-medium text-ink-2">{STATUS_LABEL.building}</strong> isn&apos;t usable yet.
      </p>

      <div className="mt-10 space-y-6">
        {MODULES.map((m) => (
          <section key={m.key} id={m.key} className="scroll-mt-24 rounded-[14px] border border-line bg-surface">
            <div className="flex items-start gap-3 border-b border-line p-5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-brand-soft">
                <Icon name={m.icon as IconName} className="size-[18px] text-brand" />
              </span>
              <div>
                <h2 className="text-[17px] font-semibold text-ink">{m.name}</h2>
                <p className="mt-0.5 text-[13.5px] text-muted">{m.summary}</p>
              </div>
            </div>
            <ul>
              {m.capabilities.map((c) => (
                <li key={c.label} className="flex flex-col gap-1.5 border-b border-line px-5 py-3.5 last:border-0 sm:flex-row sm:items-center sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium text-ink">{c.label}</p>
                    <p className="text-[13px] leading-relaxed text-muted">{c.detail}</p>
                  </div>
                  <StatusTag status={c.status} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-12 flex flex-wrap items-center gap-3">
        <Button asChild variant="primary" size="lg"><Link href="/signup">Start free</Link></Button>
        <Button asChild variant="ghost" size="lg"><Link href="/pricing">View pricing</Link></Button>
      </div>
    </div>
  );
}
