import { dateRange, dayOfWeek, type DateString } from "@/lib/dates";
import { isEligible } from "./eligibility";
import { completionRate, dayProgress, type DayProgress } from "./progress";
import { longestStreak } from "./streak";
import { isCompleted, type CompletionIndex, type MetricHabit } from "./types";

export interface PeriodSummary {
  checked: number;
  eligible: number;
  rate: number | null;
  /** Tanggal dengan seluruh habit eligible tercentang (eligible > 0). */
  perfectDays: number;
  /** Tanggal dengan minimal 1 centang. */
  activeDays: number;
  /** Hanya tanggal ≤ Hari Ini; tanggal masa depan tidak ikut dihitung. */
  days: DayProgress[];
}

export function summarizePeriod(
  habits: readonly MetricHabit[],
  index: CompletionIndex,
  from: DateString,
  to: DateString,
  today: DateString,
): PeriodSummary {
  const end = to < today ? to : today;
  const days = from > end ? [] : dateRange(from, end).map((date) => dayProgress(habits, index, date, today));

  let checked = 0;
  let eligible = 0;
  let perfectDays = 0;
  let activeDays = 0;
  for (const day of days) {
    checked += day.checked;
    eligible += day.eligible;
    if (day.eligible > 0 && day.checked === day.eligible) perfectDays++;
    if (day.checked > 0) activeDays++;
  }
  return { checked, eligible, rate: completionRate(checked, eligible), perfectDays, activeDays, days };
}

/**
 * FR-14.4. Progres harian tertinggi; seri → centang terbanyak → tanggal paling awal.
 * Hari tanpa habit eligible diabaikan.
 */
export function mostProductiveDay(days: readonly DayProgress[]): DayProgress | null {
  let best: DayProgress | null = null;
  for (const day of days) {
    if (day.ratio === null) continue;
    if (best === null || best.ratio === null) {
      best = day;
      continue;
    }
    // Bandingkan pecahan dengan perkalian silang agar bebas galat floating point.
    const lhs = day.checked * best.eligible;
    const rhs = best.checked * day.eligible;
    if (lhs > rhs || (lhs === rhs && (day.checked > best.checked || (day.checked === best.checked && day.date < best.date)))) {
      best = day;
    }
  }
  return best;
}

/** Level warna heatmap FR-16.3 (0–4), dihitung dengan bilangan bulat. */
export function heatmapLevel(checked: number, eligible: number): 0 | 1 | 2 | 3 | 4 {
  if (eligible === 0 || checked === 0) return 0;
  if (checked === eligible) return 4;
  if (checked * 100 < eligible * 40) return 1;
  if (checked * 100 < eligible * 70) return 2;
  return 3;
}

export interface WeekdayAverage {
  /** 1 = Senin ... 6 = Sabtu, 0 = Minggu. */
  dayOfWeek: number;
  /** Rata-rata progres harian; null bila tidak ada hari eligible. */
  average: number | null;
  sampleDays: number;
}

/** FR-16.4. Urutan Senin–Minggu. Hari tanpa habit eligible tidak masuk rata-rata. */
export function weekdayPattern(days: readonly DayProgress[]): WeekdayAverage[] {
  return [1, 2, 3, 4, 5, 6, 0].map((dow) => {
    const ratios = days.filter((d) => d.ratio !== null && dayOfWeek(d.date) === dow).map((d) => d.ratio as number);
    const average = ratios.length === 0 ? null : ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
    return { dayOfWeek: dow, average, sampleDays: ratios.length };
  });
}

export interface HabitPeriodStats {
  habitId: string;
  checked: number;
  eligible: number;
  rate: number | null;
  longestStreak: number;
}

/** Tabel per habit (FR-14.5, FR-16.5), mis. 5/7. */
export function habitPeriodStats(
  habit: MetricHabit,
  index: CompletionIndex,
  from: DateString,
  to: DateString,
  today: DateString,
): HabitPeriodStats {
  const end = to < today ? to : today;
  let checked = 0;
  let eligible = 0;
  if (from <= end) {
    for (const date of dateRange(from, end)) {
      if (!isEligible(habit, date, today)) continue;
      eligible++;
      if (isCompleted(index, habit.id, date)) checked++;
    }
  }
  return {
    habitId: habit.id,
    checked,
    eligible,
    rate: completionRate(checked, eligible),
    longestStreak: longestStreak(habit, index, today, { from, to: end }),
  };
}
