import Link from "next/link";
import { LogoWordmark } from "@/components/shell/logo";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
];

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1120px] items-center gap-6 px-4 sm:px-6">
          <Link href="/" aria-label="VibeShield home"><LogoWordmark /></Link>
          <nav className="hidden items-center gap-5 text-[13.5px] text-ink-2 sm:flex">
            {NAV.map((n) => <Link key={n.href} href={n.href} className="hover:text-ink">{n.label}</Link>)}
          </nav>
          <div className="flex-1" />
          <Link href="/login" className="text-[13.5px] font-medium text-ink-2 hover:text-ink">Sign in</Link>
          <Button asChild variant="primary" size="md"><Link href="/signup">Start free</Link></Button>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-3 px-4 py-8 text-[12.5px] text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} VibeShield</p>
          <nav className="flex flex-wrap gap-5">
            {NAV.map((n) => <Link key={n.href} href={n.href} className="hover:text-ink">{n.label}</Link>)}
            <Link href="/terms" className="hover:text-ink">Terms</Link>
            <Link href="/privacy" className="hover:text-ink">Privacy</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
