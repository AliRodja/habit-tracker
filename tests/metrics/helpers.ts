import { dateRange } from "@/lib/dates";
import { buildCompletionIndex, type MetricHabit, type MetricRecord } from "@/lib/metrics";

export function habit(id: string, startDate: string, archivedAt: string | null = null): MetricHabit {
  return { id, startDate, archivedAt };
}

/** Centang `habitId` pada tanggal-tanggal yang diberikan. */
export function checks(habitId: string, dates: string[]): MetricRecord[] {
  return dates.map((date) => ({ habitId, date, completed: true }));
}

export function checkRange(habitId: string, from: string, to: string): MetricRecord[] {
  return checks(habitId, dateRange(from, to));
}

export const indexOf = (...groups: MetricRecord[][]) => buildCompletionIndex(groups.flat());
