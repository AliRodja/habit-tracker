import type { DateString } from "@/lib/dates";
import { isEligible } from "./eligibility";
import { isCompleted, type CompletionIndex, type MetricHabit } from "./types";

export interface DayProgress {
  date: DateString;
  checked: number;
  eligible: number;
  /** null bila tidak ada habit eligible (ditampilkan "–", bukan 0%). */
  ratio: number | null;
}

/** FR-08. Catatan di luar rentang eligible tidak dihitung. */
export function dayProgress(
  habits: readonly MetricHabit[],
  index: CompletionIndex,
  date: DateString,
  today: DateString,
): DayProgress {
  let eligible = 0;
  let checked = 0;
  for (const habit of habits) {
    if (!isEligible(habit, date, today)) continue;
    eligible++;
    if (isCompleted(index, habit.id, date)) checked++;
  }
  return { date, checked, eligible, ratio: eligible === 0 ? null : checked / eligible };
}

/** Tingkat penyelesaian = Σ centang / Σ habit-day eligible; null bila penyebut 0. */
export function completionRate(checked: number, eligible: number): number | null {
  return eligible === 0 ? null : checked / eligible;
}

/** Selisih dalam poin persentase (mis. 0.6 → 0.5 = -10); null bila salah satu periode kosong. */
export function percentagePointChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null) return null;
  return Math.round((current - previous) * 1000) / 10;
}
