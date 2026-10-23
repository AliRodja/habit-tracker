import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { MainNav } from "@/components/layout/main-nav";
import { ThemeSync } from "@/components/layout/theme-sync";
import type { Theme } from "@/lib/constants";
import { getSettings } from "@/lib/services/settings-store";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Daily Habit Tracker", template: "%s · Daily Habit Tracker" },
  description: "Pelacak kebiasaan harian lokal dengan analitik otomatis.",
};

async function ThemeFromSettings() {
  const { theme } = await getSettings();
  return <ThemeSync theme={theme as Theme} />;
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: skrip tema di <head> memasang data-theme sebelum React hydrate.
    <html lang="id" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full md:flex">
        <Suspense>
          <ThemeFromSettings />
        </Suspense>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-foreground focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-background"
        >
          Lewati ke konten utama
        </a>
        <aside className="border-b border-border bg-surface p-3 md:min-h-screen md:w-56 md:shrink-0 md:border-r md:border-b-0 md:p-4 print:hidden">
          <p className="mb-3 hidden px-3 text-sm font-semibold md:block">Habit Tracker</p>
          <MainNav />
        </aside>
        <main id="main-content" tabIndex={-1} className="mx-auto w-full min-w-0 max-w-5xl flex-1 p-4 outline-none md:p-8">{children}</main>
      </body>
    </html>
  );
}
