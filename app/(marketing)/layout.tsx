import { Instrument_Serif, Inter } from "next/font/google";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { cn } from "@/lib/utils";

const display = Instrument_Serif({ weight: "400", subsets: ["latin"], variable: "--font-mk-display", display: "swap" });
const sans = Inter({ subsets: ["latin"], variable: "--font-mk-sans", display: "swap" });

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn(display.variable, sans.variable, "mk-root flex min-h-dvh flex-col font-mk antialiased")}>
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-white px-4 py-2 text-mk-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
