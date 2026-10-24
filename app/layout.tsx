import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Lock } from "lucide-react";
import Image from "next/image";
import { Suspense } from "react";
import { MainNav } from "@/components/layout/main-nav";
import { PreferencesSync } from "@/components/layout/preferences-sync";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import type { Theme } from "@/lib/constants";
import { getSettings } from "@/lib/services/settings-store";
import { PREFERENCES_INIT_SCRIPT } from "@/lib/theme";
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

async function PreferencesFromSettings() {
  const { theme, gamification } = await getSettings();
  return <PreferencesSync theme={theme as Theme} gamification={gamification !== "off"} />;
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: skrip di <head> memasang data-theme/data-gamification sebelum React hydrate.
    <html lang="id" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREFERENCES_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full md:flex">
        <Suspense>
          <PreferencesFromSettings />
        </Suspense>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-accent-foreground"
        >
          Lewati ke konten utama
        </a>
        <aside className="border-b border-border bg-surface print:hidden md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col md:border-r md:border-b-0 md:p-4">
          <div className="flex items-center gap-2.5 px-4 py-3 md:mb-6 md:px-2 md:py-1">
            {/* Dekoratif: nama aplikasi sudah tertulis di sebelahnya. */}
            <Image src="/logo.png" alt="" width={40} height={40} priority className="size-10 shrink-0" />
            <div className="leading-tight">
              <p className="font-semibold">Habit Tracker</p>
              <p className="text-xs text-muted">Kebiasaan kecil, setiap hari</p>
            </div>
            <ThemeToggle variant="icon" />
          </div>
          <MainNav />
          <ThemeToggle variant="row" />
          <p className="hidden items-start gap-2 rounded-lg bg-surface-2 p-3 text-xs text-muted md:flex">
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
