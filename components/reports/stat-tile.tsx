import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { formatPercent } from "@/lib/format";

interface DeltaProps {
  /** Selisih dalam poin persentase; null bila tidak ada pembanding. */
  points: number | null;
  against: string;
}

/** Delta: arah + ikon + teks, warna hanya penegas (NFR-07). Naik = baik untuk tingkat penyelesaian. */
function Delta({ points, against }: DeltaProps) {
  if (points === null) return <p className="mt-1 text-xs text-muted">Belum ada pembanding</p>;
  if (points === 0) {
    return (
      <p className="mt-1 flex items-center gap-1 text-xs text-muted">
        <Minus className="size-3.5" aria-hidden /> Sama dengan {against}
      </p>
    );
  }
  const up = points > 0;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <p className="mt-1 flex items-center gap-1 text-xs font-medium" style={{ color: up ? "var(--chart-good)" : "var(--chart-critical)" }}>
      <Icon className="size-3.5" aria-hidden />
      {up ? "Naik" : "Turun"} {Math.abs(points).toLocaleString("id-ID")} poin dari {against}
    </p>
  );
}

interface StatTileProps {
  label: string;
  value: string;
  note?: string;
  delta?: DeltaProps;
}

export function StatTile({ label, value, note, delta }: StatTileProps) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight">{value}</p>
      {delta && <Delta {...delta} />}
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
    </div>
  );
}

export const rateText = (rate: number | null) => formatPercent(rate);
