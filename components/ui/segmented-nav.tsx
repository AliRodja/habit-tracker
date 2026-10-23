import Link from "next/link";

export interface SegmentItem {
  href: string;
  label: string;
  active: boolean;
}

/** Pilihan tampilan berbentuk tautan (mengubah URL), mis. Bulanan/Tahunan. */
export function SegmentedNav({ label, items }: { label: string; items: SegmentItem[] }) {
  return (
    <nav aria-label={label} className="inline-flex rounded-xl border border-border bg-surface-2 p-1 text-sm">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
            item.active ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
