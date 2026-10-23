import type { DateString } from "@/lib/dates";

/** Subset field Habit yang dibutuhkan metrik; sengaja lepas dari tipe Prisma agar modul ini murni. */
export interface MetricHabit {
  id: string;
  startDate: DateString;
  archivedAt: DateString | null;
}

export interface MetricRecord {
  habitId: string;
  date: DateString;
  completed: boolean;
}

/** Kumpulan kunci `habitId|date` untuk catatan yang tercentang. */
export type CompletionIndex = ReadonlySet<string>;

export function buildCompletionIndex(records: Iterable<MetricRecord>): CompletionIndex {
  const index = new Set<string>();
  for (const record of records) {
    if (record.completed) index.add(`${record.habitId}|${record.date}`);
  }
  return index;
}

export function isCompleted(index: CompletionIndex, habitId: string, date: DateString): boolean {
  return index.has(`${habitId}|${date}`);
}
