import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Lock, Sprout } from "lucide-react";
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
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-accent-foreground"
        >
          Lewati ke konten utama
        </a>
        <aside className="border-b border-border bg-surface print:hidden md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:flex-col md:border-r md:border-b-0 md:p-4">
          <div className="flex items-center gap-2.5 px-4 py-3 md:mb-6 md:px-2 md:py-1">
            <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Sprout className="size-4.5" aria-hidden />
            </span>
            <div className="leading-tight">
              <p className="font-semibold">Habit Tracker</p>
              <p className="text-xs text-muted">Kebiasaan kecil, setiap hari</p>
            </div>
          </div>
          <MainNav />
          <p className="mt-auto hidden items-start gap-2 rounded-lg bg-surface-2 p-3 text-xs text-muted md:flex">
            <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            Semua data tersimpan di komputer ini, tanpa akun dan tanpa internet.
          </p>
        </aside>
        <main id="main-content" tabIndex={-1} className="mx-auto w-full min-w-0 max-w-5xl flex-1 px-4 pt-6 pb-28 outline-none md:px-8 md:pt-10 md:pb-12">
          {children}
        </main>
      </body>
    </html>
  );
}
