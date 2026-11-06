"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { BrandGlyph, type BrandName } from "@/components/ui/brand-glyph";
import { BrandAvatar } from "../brand-mark";

/* Autoplaying, time-based product illustration. One effect advances STEPS
 * while at least half the mockup is in view; reduced motion shows the last
 * step, still. */

type Tool = "github" | "supabase" | "vercel";
type ChipState = "idle" | "pending" | "done";
type Card =
  | { kind: "intro" }
  | { kind: "connect"; tool: Tool; title: string; badge: "Monitoring" | "Connected"; green: boolean }
  | { kind: "summary" }
  | { kind: "agent" };

interface Step {
  icons: 3 | 4;
  caption: string;
  chips: Record<Tool, ChipState>;
  card: Card;
  ms?: number;
}

const STEP_MS = 1300;
const TOOLS: { key: Tool; label: string }[] = [
  { key: "github", label: "GitHub" },
  { key: "supabase", label: "Supabase" },
  { key: "vercel", label: "Vercel" },
];
const PILL_ICONS: BrandName[] = ["github", "supabase", "vercel", "stripe"];

const chips = (github: ChipState, supabase: ChipState, vercel: ChipState) => ({ github, supabase, vercel });
const CONNECT = "Let's connect your stack…";

const STEPS: Step[] = [
  { icons: 3, caption: CONNECT, chips: chips("idle", "idle", "idle"), card: { kind: "intro" } },
  { icons: 3, caption: CONNECT, chips: chips("pending", "idle", "idle"), card: { kind: "connect", tool: "github", title: "Connecting GitHub", badge: "Monitoring", green: false } },
  { icons: 3, caption: CONNECT, chips: chips("pending", "idle", "idle"), card: { kind: "connect", tool: "github", title: "GitHub connected", badge: "Connected", green: false } },
  { icons: 3, caption: CONNECT, chips: chips("done", "idle", "idle"), card: { kind: "connect", tool: "github", title: "GitHub connected", badge: "Connected", green: true } },
  { icons: 3, caption: CONNECT, chips: chips("done", "done", "idle"), card: { kind: "connect", tool: "supabase", title: "Supabase connected", badge: "Connected", green: true } },
  { icons: 3, caption: CONNECT, chips: chips("done", "done", "done"), card: { kind: "connect", tool: "vercel", title: "Vercel connected", badge: "Connected", green: true } },
  { icons: 4, caption: "Scanning your app…", chips: chips("done", "done", "done"), card: { kind: "summary" }, ms: 1600 },
  { icons: 4, caption: "Scan complete", chips: chips("done", "done", "done"), card: { kind: "agent" }, ms: 3600 },
];

const cardKey = (c: Card) => (c.kind === "connect" ? `connect-${c.tool}` : c.kind);
const SPRING = { type: "spring", stiffness: 320, damping: 30 } as const;

export function HeroDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.5 });
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!inView || reduce) return;
    const t = setTimeout(() => setIndex((n) => (n + 1) % STEPS.length), STEPS[index].ms ?? STEP_MS);
    return () => clearTimeout(t);
  }, [index, inView, reduce]);

  const step = reduce ? STEPS[STEPS.length - 1] : STEPS[index];

  return (
    <div
      ref={ref}
      role="img"
      aria-label="Illustration: VibeShield connects GitHub, Supabase and Vercel, scans the app, and flags an exposed key with a one-click fix."
      className="flex h-[440px] flex-col items-center justify-center gap-4 px-4 pb-10 text-left text-mk-ink"
    >
      <IntegrationPill icons={step.icons} caption={step.caption} animate={!reduce} />
      <StatusRow chips={step.chips} />
      <div className="relative mt-2 h-[230px] w-full max-w-[380px]">
        <Deck hidden={step.card.kind === "agent"} />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={cardKey(step.card)}
            initial={{ y: 14, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -14, opacity: 0, scale: 0.96 }}
            transition={SPRING}
            className="absolute inset-x-0 top-0"
          >
            <CardBody card={step.card} animate={!reduce} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function IntegrationPill({ icons, caption, animate }: { icons: 3 | 4; caption: string; animate: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-full bg-white/90 py-1.5 pl-1.5 pr-4 shadow-sm">
      <div className="flex -space-x-2">
        <AnimatePresence initial={false}>
          {PILL_ICONS.slice(0, icons).map((name) => (
            <motion.span
              key={name}
              initial={animate ? { scale: 0, opacity: 0 } : false}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={SPRING}
              className="grid size-8 place-items-center rounded-full bg-white ring-2 ring-mk-mock"
            >
              <BrandGlyph name={name} size={16} />
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
      <span className="text-[13.5px] font-medium">{caption}</span>
    </div>
  );
}

const DOT: Record<ChipState, string> = {
  idle: "bg-mk-ink/25",
  pending: "bg-amber-400",
  done: "bg-mk-green",
};

function StatusRow({ chips }: { chips: Record<Tool, ChipState> }) {
  return (
    <ul className="flex flex-wrap justify-center gap-2">
      {TOOLS.map((t) => (
        <li key={t.key} className="flex items-center gap-1.5 rounded-full bg-white/60 px-3 py-1 text-[12.5px] font-medium">
          <span className={cn("size-2 rounded-full transition-colors duration-500", DOT[chips[t.key]])} />
          {t.label}
        </li>
      ))}
    </ul>
  );
}

/** Two lighter cards stacked behind the front card. */
function Deck({ hidden }: { hidden: boolean }) {
  return (
    <div aria-hidden className={cn("transition-opacity duration-300", hidden && "opacity-0")}>
      <div className="absolute inset-x-0 top-0 h-[150px] translate-y-6 scale-[0.86] rounded-2xl bg-white/30" />
      <div className="absolute inset-x-0 top-0 h-[150px] translate-y-3 scale-[0.93] rounded-2xl bg-white/55" />
    </div>
  );
}

const CARD = "h-[150px] rounded-2xl bg-white p-5 shadow-[0_16px_40px_-20px_rgb(31_1_61/0.5)]";

function CardBody({ card, animate }: { card: Card; animate: boolean }) {
  switch (card.kind) {
    case "intro":
      return (
        <div className={cn(CARD, "flex flex-col justify-center gap-3")}>
          <div className="h-3 w-2/3 rounded-full bg-mk-card" />
          <div className="h-3 w-1/2 rounded-full bg-mk-card" />
          <p className="pt-1 text-[13px] text-mk-ink/60">Waiting for your first connection</p>
        </div>
      );
    case "connect":
      return (
        <div className={cn(CARD, "flex items-center gap-4")}>
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-mk-card">
            <BrandGlyph name={card.tool} size={24} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[23px] leading-tight">{card.title}</p>
            <p className="mt-0.5 text-[12.5px] text-mk-ink/60">Read-only access</p>
          </div>
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors duration-500",
              card.green ? "bg-mk-green/15 text-mk-green" : "bg-mk-card text-mk-ink/65",
            )}
          >
            {card.badge}
          </span>
        </div>
      );
    case "summary":
      return (
        <div className={cn(CARD, "flex flex-col justify-center gap-3")}>
          <div className="flex items-center gap-3">
            <BrandAvatar />
            <p className="font-display text-[23px] leading-tight">4 tools connected</p>
          </div>
          <p className="text-[13px] text-mk-ink/65">Checking secrets, database policies, webhooks and loops…</p>
          <div className="h-1.5 overflow-hidden rounded-full bg-mk-card">
            <motion.div
              className="h-full origin-left rounded-full bg-mk-violet"
              initial={{ scaleX: animate ? 0 : 1 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.3, ease: "easeInOut" }}
            />
          </div>
        </div>
      );
    case "agent":
      return <AgentCard animate={animate} />;
  }
}

/** The finding, then a cursor that glides to "Generate fix" and presses it. */
function AgentCard({ animate }: { animate: boolean }) {
  // 0 gliding · 1 hand over button · 2 pressed · 3 released
  const [phase, setPhase] = useState(animate ? 0 : 3);

  useEffect(() => {
    if (!animate) return;
    const timers = [setTimeout(() => setPhase(1), 1750), setTimeout(() => setPhase(2), 1950), setTimeout(() => setPhase(3), 2150)];
    return () => timers.forEach(clearTimeout);
  }, [animate]);

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2.5">
        <BrandAvatar />
        <p className="rounded-2xl rounded-tl-md bg-white px-3.5 py-2 text-[13.5px] font-medium shadow-sm">One finding needs a fix before launch</p>
      </div>
      <motion.div
        initial={animate ? { opacity: 0, y: 8 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, ...SPRING }}
        className="relative rounded-2xl bg-white p-4 shadow-[0_16px_40px_-20px_rgb(31_1_61/0.5)]"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="font-display text-[21px] leading-tight">Service-role key exposed in client code</p>
          <span className="shrink-0 rounded-full bg-mk-critical/12 px-2 py-0.5 text-[11.5px] font-semibold text-mk-critical">Critical</span>
        </div>
        <p className="mt-1 font-mono text-[11.5px] text-mk-ink/55">src/lib/supabaseClient.ts:4</p>
        <div className="mt-3 flex justify-end">
          <motion.span
            animate={{ scale: phase === 2 ? 0.92 : 1 }}
            transition={{ duration: 0.12 }}
            className="relative inline-flex h-9 items-center rounded-full bg-mk-cta px-4 text-[13px] font-medium text-white"
          >
            Generate fix
            {animate && <FakeCursor hand={phase >= 1} />}
          </motion.span>
        </div>
      </motion.div>
    </div>
  );
}

function FakeCursor({ hand }: { hand: boolean }) {
  return (
    <motion.span
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 text-mk-ink"
      initial={{ x: 110, y: 70, opacity: 0 }}
      animate={{ x: 0, y: 0, opacity: 1 }}
      transition={{ delay: 0.9, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      {hand ? (
        <svg width="22" height="22" viewBox="0 0 24 24">
          <path
            d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10h.5V8.5a1.5 1.5 0 0 1 3 0V10h.5V9.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-.6a6 6 0 0 1-4.6-2.2L4.6 15.9a1.5 1.5 0 0 1 2.3-1.9L9 16.3V11Z"
            fill="white"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path d="M5 3l14 7.5-6.2 1.6L10 18.5 5 3Z" fill="white" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      )}
    </motion.span>
  );
}
