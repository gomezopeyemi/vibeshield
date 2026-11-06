"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { RESOURCES, themeAttrs } from "@/lib/brand";

export function Resources() {
  return (
    <section id="resources" {...themeAttrs("offwhite")} aria-labelledby="resources-title" className="mx-auto max-w-[1240px] scroll-mt-24 px-4 pt-24 sm:px-6 sm:pt-32">
      <h2 id="resources-title" className="font-display text-[40px] leading-[1.05] sm:text-[56px]">Resources</h2>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {RESOURCES.map((r, i) => (
          <motion.li
            key={r.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <ResourceCard {...r} />
          </motion.li>
        ))}
      </ul>
    </section>
  );
}

function ResourceCard({ kind, title, href, art }: (typeof RESOURCES)[number]) {
  const body = (
    <>
      <div className="grid h-36 place-items-center overflow-hidden rounded-xl bg-mk-card p-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG */}
        <img src={art} alt="" width={200} height={120} loading="lazy" className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.03]" />
      </div>
      <p className="mt-5 text-[12px] font-medium uppercase tracking-[0.14em] opacity-55">{kind}</p>
      <h3 className="mt-1.5 font-display text-[24px] leading-tight">{title}</h3>
      <p className="mt-auto flex items-center gap-1.5 pt-6 text-[14px] font-medium">
        {href ? (
          <>
            Read more <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
          </>
        ) : (
          <span className="opacity-55">Coming soon</span>
        )}
      </p>
    </>
  );
  const cls = "group flex h-full min-h-[320px] flex-col rounded-2xl bg-white p-4 text-mk-ink ring-1 ring-mk-ink/8";
  if (!href) return <div className={cls}>{body}</div>;
  return (
    <Link href={href} className={`${cls} outline-none transition-shadow hover:shadow-[0_20px_40px_-24px_rgb(31_1_61/0.45)] focus-visible:ring-2 focus-visible:ring-mk-violet`}>
      {body}
    </Link>
  );
}
