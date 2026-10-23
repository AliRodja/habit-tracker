import { shiftDate, type DateString } from "@/lib/dates";
import { isEligible, lastEligibleDate } from "./eligibility";
import { isCompleted, type CompletionIndex, type MetricHabit } from "./types";

/**
 * FR-12.1. Dihitung mundur dari tanggal eligible terakhir. Bila itu Hari Ini dan belum dicentang,
 * mulai dari kemarin: hari yang belum selesai tidak memutus streak.
 */
export function currentStreak(habit: MetricHabit, index: CompletionIndex, today: DateString): number {
  const last = lastEligibleDate(habit, today);
  if (last === null) return 0;

  let cursor = last;
  if (cursor === today && !isCompleted(index, habit.id, cursor)) cursor = shiftDate(cursor, -1);

  let streak = 0;
  while (cursor >= habit.startDate && isCompleted(index, habit.id, cursor)) {
    streak++;
    cursor = shiftDate(cursor, -1);
  }
  return streak;
}

/** FR-12.2. Rangkaian terpanjang; `range` membatasi hanya hari di dalamnya (mis. satu tahun). */
export function longestStreak(
  habit: MetricHabit,
  index: CompletionIndex,
  today: DateString,
  range?: { from: DateString; to: DateString },
): number {
  const last = lastEligibleDate(habit, today);
  if (last === null) return 0;

  const from = range && range.from > habit.startDate ? range.from : habit.startDate;
  const to = range && range.to < last ? range.to : last;

  let longest = 0;
  let run = 0;
  for (let date = from; date <= to; date = shiftDate(date, 1)) {
    if (isEligible(habit, date, today) && isCompleted(index, habit.id, date)) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 0;
    }
  }
  return longest;
}
