import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { btnIcon } from "./styles";

interface Props {
  label: string;
  previous: { href: string; label: string } | null;
  next: { href: string; label: string } | null;
}

/** Navigasi periode ‹ label ›; tombol yang tidak tersedia tampil nonaktif. */
export function PeriodNav({ label, previous, next }: Props) {
  const arrow = (target: Props["previous"], Icon: typeof ChevronLeft, fallback: string) =>
    target ? (
      <Link href={target.href} className={btnIcon} aria-label={target.label}>
        <Icon className="size-4" aria-hidden />
      </Link>
    ) : (
      <span className={`${btnIcon} opacity-40`} aria-hidden title={fallback}>
        <Icon className="size-4" />
      </span>
    );

  return (
    <div className="flex items-center gap-2">
      {arrow(previous, ChevronLeft, "Tidak ada periode sebelumnya")}
      <p className="min-w-36 text-center font-semibold capitalize" aria-live="polite">
        {label}
      </p>
      {arrow(next, ChevronRight, "Tidak ada periode berikutnya")}
    </div>
  );
}
