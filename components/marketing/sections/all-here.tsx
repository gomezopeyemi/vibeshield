"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { ALL_HERE, themeAttrs } from "@/lib/brand";
import { BrandAvatar } from "../brand-mark";
import { PillLink } from "../pill-link";

export function AllHere() {
  return (
    <section {...themeAttrs("offwhite")} aria-labelledby="all-here-title" className="mx-auto max-w-[1240px] px-4 py-24 sm:px-6 sm:py-32">
      <div className="text-center">
        <h2 id="all-here-title" className="mx-auto max-w-[18ch] font-display text-[40px] leading-[1.05] sm:text-[60px]">
          {ALL_HERE.heading}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[17px] opacity-70">{ALL_HERE.subhead}</p>
      </div>

      <ul className="mt-14 grid gap-4 md:grid-cols-3">
        {ALL_HERE.cards.map((c, i) => (
          <SkeletonCard key={c.title} index={i} title={c.title} body={c.body} />
        ))}
      </ul>

      <div className="mt-24 grid items-center gap-12 md:grid-cols-2 md:gap-16">
        <ChatMock />
        <div>
          <h3 className="font-display text-[34px] leading-tight sm:text-[44px]">{ALL_HERE.feature.heading}</h3>
          <p className="mt-4 max-w-md text-[16.5px] leading-relaxed opacity-75">{ALL_HERE.feature.body}</p>
          <PillLink href={ALL_HERE.feature.cta.href} arrow className="mt-7">
            {ALL_HERE.feature.cta.label}
          </PillLink>
        </div>
      </div>
    </section>
  );
}

/** A grey skeleton that fades into the real content when it comes into view. */
function SkeletonCard({ index, title, body }: { index: number; title: string; body: string }) {
  const reveal = { delay: 0.25 + index * 0.15, duration: 0.5 };
  const viewport = { once: true, amount: 0.6 };
  return (
    <li className="relative h-[200px] overflow-hidden rounded-2xl bg-mk-card p-6 text-mk-ink">
      <motion.div aria-hidden className="absolute inset-0 space-y-3 p-6" initial={{ opacity: 1 }} whileInView={{ opacity: 0 }} viewport={viewport} transition={reveal}>
        <div className="size-9 rounded-full bg-white/80" />
        <div className="h-4 w-1/2 rounded-full bg-white/80" />
        <div className="h-3 w-5/6 rounded-full bg-white/70" />
        <div className="h-3 w-2/3 rounded-full bg-white/70" />
      </motion.div>
      <motion.div className="relative flex h-full flex-col justify-end" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={viewport} transition={reveal}>
        <span className="font-mono text-[12px] opacity-50">0{index + 1}</span>
        <h3 className="mt-2 font-display text-[30px] leading-none">{title}</h3>
        <p className="mt-2 text-[14.5px] leading-snug opacity-70">{body}</p>
      </motion.div>
    </li>
  );
}

function ChatMock() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const full = ALL_HERE.chat.answer;
  const [typed, setTyped] = useState(0);

  useEffect(() => {
    if (!inView || reduce) return;
    let n = 0;
    let id: ReturnType<typeof setInterval> | undefined;
    // Start once the reply bubble has appeared.
    const start = setTimeout(() => {
      id = setInterval(() => {
        n += 2;
        setTyped(Math.min(n, full.length));
        if (n >= full.length) clearInterval(id);
      }, 28);
    }, 700);
    return () => {
      clearTimeout(start);
      clearInterval(id);
    };
  }, [inView, reduce, full.length]);

  const shown = reduce ? full.length : typed;
  const bubble = (delay: number) => ({
    initial: { opacity: 0, y: 10 },
    animate: inView ? { opacity: 1, y: 0 } : undefined,
    transition: { delay, type: "spring" as const, stiffness: 320, damping: 30 },
  });

  return (
    <div ref={ref} role="img" aria-label={`Illustration. Question: ${ALL_HERE.chat.question} Answer: ${full}`} className="rounded-3xl bg-mk-card p-5 text-mk-ink sm:p-8">
      <motion.div {...bubble(0)} className="flex items-end justify-end gap-2.5">
        <p className="max-w-[75%] rounded-2xl rounded-br-md bg-white/70 px-4 py-2.5 text-[14.5px]">{ALL_HERE.chat.question}</p>
        <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-mk-lavender text-[12px] font-semibold">You</span>
      </motion.div>
      <motion.div {...bubble(0.5)} className="mt-5 flex items-start gap-2.5">
        <BrandAvatar />
        {/* The full text reserves the bubble's final size, so typing never shifts layout. */}
        <p className="relative max-w-[85%] rounded-2xl rounded-tl-md bg-white px-4 py-3 text-[14.5px] leading-relaxed shadow-[0_10px_30px_-15px_rgb(31_1_61/0.35)]">
          <span className="invisible">{full}</span>
          <span className="absolute inset-0 px-4 py-3">{full.slice(0, shown)}</span>
        </p>
      </motion.div>
    </div>
  );
}
