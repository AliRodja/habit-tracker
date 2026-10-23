"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/reports/weekly", label: "Mingguan" },
  { href: "/reports/monthly", label: "Bulanan" },
  { href: "/reports/yearly", label: "Tahunan" },
];

export function ReportTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Jenis laporan" className="flex w-fit rounded-lg border border-border bg-surface p-0.5 text-sm">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-3 py-1 ${active ? "bg-foreground text-background" : "text-muted hover:text-foreground"}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
