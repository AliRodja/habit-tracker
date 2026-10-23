import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { MainNav } from "@/components/layout/main-nav";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full md:flex">
        <aside className="border-b border-border bg-surface p-3 md:min-h-screen md:w-56 md:shrink-0 md:border-r md:border-b-0 md:p-4">
          <p className="mb-3 hidden px-3 text-sm font-semibold md:block">Habit Tracker</p>
          <MainNav />
        </aside>
        <main className="mx-auto w-full max-w-5xl flex-1 p-4 md:p-8">{children}</main>
      </body>
    </html>
  );
}
