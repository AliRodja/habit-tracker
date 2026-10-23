import type { DateString } from "@/lib/dates";
import { dateRange } from "@/lib/dates";
import { isEligible, type MetricHabit } from "@/lib/metrics";

export interface GridCell {
  /** Sel hanya dapat diubah bila habit eligible pada tanggal itu (FR-07.3). */
  eligible: boolean;
  completed: boolean;
  note: string | null;
}

export interface GridRow {
  date: DateString;
  isToday: boolean;
  cells: GridCell[];
}

export interface GridRecord {
  habitId: string;
  date: DateString;
  completed: boolean;
  note: string | null;
}

/** Bentuk baris grid (satu per tanggal, satu sel per habit sesuai urutan `habits`). */
export function buildGridRows(
  habits: readonly MetricHabit[],
  records: readonly GridRecord[],
  from: DateString,
  to: DateString,
  today: DateString,
): GridRow[] {
  const byKey = new Map(records.map((record) => [`${record.habitId}|${record.date}`, record]));
  return dateRange(from, to).map((date) => ({
    date,
    isToday: date === today,
    cells: habits.map((habit) => {
      const record = byKey.get(`${habit.id}|${date}`);
      return {
        eligible: isEligible(habit, date, today),
        completed: record?.completed ?? false,
        note: record?.note ?? null,
      };
    }),
  }));
}

/** Progres harian baris (FR-08); ratio null bila tidak ada habit eligible. */
export function rowProgress(row: GridRow): { checked: number; eligible: number; ratio: number | null } {
  let checked = 0;
  let eligible = 0;
  for (const cell of row.cells) {
    if (!cell.eligible) continue;
    eligible++;
    if (cell.completed) checked++;
  }
  return { checked, eligible, ratio: eligible === 0 ? null : checked / eligible };
}
