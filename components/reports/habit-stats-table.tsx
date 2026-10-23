import { colorDot } from "@/lib/habit-colors";
import { formatPercent } from "@/lib/format";
import type { HabitRow } from "@/lib/reports";

/** Tabel per habit (FR-14.5, FR-16.5). `showStreak` menambah kolom streak terpanjang. */
export function HabitStatsTable({ rows, showStreak = false }: { rows: HabitRow[]; showStreak?: boolean }) {
  if (rows.length === 0) return <p className="text-sm text-muted">Belum ada habit pada periode ini.</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border text-muted">
            <th scope="col" className="px-4 py-2 font-medium">Habit</th>
            <th scope="col" className="px-4 py-2 text-right font-medium">Centang</th>
            <th scope="col" className="px-4 py-2 text-right font-medium">Tingkat</th>
            {showStreak && <th scope="col" className="px-4 py-2 text-right font-medium">Streak terpanjang</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.habitId} className="border-b border-border last:border-b-0">
              <th scope="row" className="px-4 py-2 font-normal">
                <span className="flex items-center gap-2">
                  <span className={`size-2.5 rounded-full ${colorDot(row.color)}`} aria-hidden />
                  {row.name}
                </span>
              </th>
              <td className="px-4 py-2 text-right tabular-nums">
                {row.checked}/{row.eligible}
              </td>
              <td className="px-4 py-2 text-right tabular-nums">{formatPercent(row.rate)}</td>
              {showStreak && <td className="px-4 py-2 text-right tabular-nums">{row.longestStreak} hari</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
