import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { AppProvider } from "@/components/providers";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — Launch Readiness`,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_TAGLINE,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-canvas text-ink antialiased">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
