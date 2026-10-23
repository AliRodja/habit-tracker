"use client";

import { BarChart3, CalendarDays, CheckSquare, ListChecks, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Hari Ini", icon: CheckSquare, match: "/" },
  { href: "/tracker", label: "Tracker", icon: CalendarDays, match: "/tracker" },
  { href: "/habits", label: "Habit", icon: ListChecks, match: "/habits" },
  { href: "/reports/weekly", label: "Laporan", icon: BarChart3, match: "/reports" },
  { href: "/settings", label: "Pengaturan", icon: Settings, match: "/settings" },
] as const;

/** Satu elemen navigasi: tab bar tetap di bawah layar pada ponsel, daftar vertikal di sidebar pada desktop. */
export function MainNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:static md:border-0 md:bg-transparent md:pb-0 md:backdrop-blur-none"
    >
      <ul className="mx-auto flex max-w-lg md:max-w-none md:flex-col md:gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon, match }) => {
          const active = match === "/" ? pathname === "/" : pathname.startsWith(match);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 px-1 py-2 text-[11px] font-medium transition-colors md:flex-row md:gap-3 md:rounded-lg md:px-3 md:py-2 md:text-sm ${
                  active
                    ? "text-accent-text md:bg-accent-soft"
                    : "text-muted hover:text-foreground md:hover:bg-surface-2"
                }`}
              >
                <Icon className="size-5 md:size-4" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
