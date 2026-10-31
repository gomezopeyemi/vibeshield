import Link from "next/link";
import { LogoWordmark } from "@/components/shell/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="flex h-16 items-center px-4 sm:px-6">
        <Link href="/" aria-label="VibeShield home"><LogoWordmark /></Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:pt-12">{children}</main>
      <footer className="flex justify-center gap-4 pb-6 text-[12px] text-faint">
        <Link href="/terms" className="hover:text-ink-2">Terms</Link>
        <Link href="/privacy" className="hover:text-ink-2">Privacy</Link>
      </footer>
    </div>
  );
}
