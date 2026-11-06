import Link from "next/link";
import { BRAND, FOOTER_COLUMNS, LEGAL_LINKS, themeAttrs } from "@/lib/brand";
import { Wordmark } from "./brand-mark";

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4" fill="currentColor">
      <path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L1.9 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4" fill="currentColor">
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.5h4V21H3V9.5Zm7 0h3.8v1.6h.1c.5-1 1.8-2 3.8-2 4 0 4.8 2.6 4.8 6V21h-4v-5.1c0-1.2 0-2.8-1.7-2.8s-2 1.3-2 2.7V21h-4V9.5Z" />
    </svg>
  );
}

export function SiteFooter() {
  const socials = [
    { href: BRAND.social.linkedin, label: "LinkedIn", icon: <LinkedInIcon /> },
    { href: BRAND.social.x, label: "X", icon: <XIcon /> },
  ].filter((s): s is typeof s & { href: string } => Boolean(s.href));

  return (
    <footer {...themeAttrs("footer")} className="bg-mk-footer text-mk-offwhite">
      <div className="mx-auto max-w-[1240px] px-4 pb-10 pt-16 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Wordmark className="text-[30px]" />
            <p className="mt-3 max-w-xs text-[14px] leading-relaxed text-white/65">
              Launch readiness for apps built with AI coding tools.
            </p>
            {socials.length > 0 && (
              <ul className="mt-5 flex gap-2">
                {socials.map((s) => (
                  <li key={s.label}>
                    <a href={s.href} aria-label={s.label} className="grid size-9 place-items-center rounded-full ring-1 ring-white/20 transition-colors hover:bg-white/10">
                      {s.icon}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {FOOTER_COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="text-[12px] font-medium uppercase tracking-[0.14em] text-white/50">{col.title}</h2>
              <ul className="mt-4 space-y-2.5 text-[14.5px]">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.href ? (
                      <Link href={l.href} className="text-white/85 hover:text-white">{l.label}</Link>
                    ) : (
                      <span className="text-white/45">{l.label} · soon</span>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/12 pt-6 text-[13px] text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {BRAND.name}. Early access.</p>
          <ul className="flex gap-5">
            {LEGAL_LINKS.map((l) => (
              <li key={l.label}>
                <Link href={l.href} className="hover:text-white">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
