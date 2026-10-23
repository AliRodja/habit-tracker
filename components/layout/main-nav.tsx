"use client";

import { BarChart3, CalendarDays, CheckSquare, ListChecks, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Hari Ini", icon: CheckSquare },
  { href: "/tracker", label: "Tracker", icon: CalendarDays },
  { href: "/habits", label: "Habit", icon: ListChecks },
  { href: "/reports/weekly", label: "Laporan", icon: BarChart3, match: "/reports" },
  { href: "/settings", label: "Pengaturan", icon: Settings },
] as const;

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navigasi utama" className="flex gap-1 overflow-x-auto md:flex-col">
      {NAV_ITEMS.map((item) => {
        const prefix = "match" in item ? item.match : item.href;
        const active = prefix === "/" ? pathname === "/" : pathname.startsWith(prefix);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active ? "bg-foreground text-background" : "text-muted hover:bg-border hover:text-foreground"
            }`}
          >
            <Icon className="size-4" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
