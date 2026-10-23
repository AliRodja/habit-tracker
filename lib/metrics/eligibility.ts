import { shiftDate, type DateString } from "@/lib/dates";
import type { MetricHabit } from "./types";

/**
 * Habit eligible pada tanggal d bila startDate ≤ d, d < archivedAt (jika ada), dan d ≤ Hari Ini.
 */
export function isEligible(habit: MetricHabit, date: DateString, today: DateString): boolean {
  if (date < habit.startDate || date > today) return false;
  return habit.archivedAt === null || date < habit.archivedAt;
}

/** Tanggal eligible terakhir habit, atau null bila belum pernah eligible. */
export function lastEligibleDate(habit: MetricHabit, today: DateString): DateString | null {
  let end = today;
  if (habit.archivedAt !== null) {
    const beforeArchive = shiftDate(habit.archivedAt, -1);
    if (beforeArchive < end) end = beforeArchive;
  }
  return end >= habit.startDate ? end : null;
}
