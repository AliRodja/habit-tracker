import { dateRange, dayOfWeek, monthBounds, shiftDate, yearBounds, type DateString } from "@/lib/dates";
import {
  dayProgress,
  habitPeriodStats,
  heatmapLevel,
  mostProductiveDay,
  percentagePointChange,
  summarizePeriod,
  weekdayPattern,
  type CompletionIndex,
  type DayProgress,
  type HabitPeriodStats,
  type MetricHabit,
  type PeriodSummary,
  type WeekdayAverage,
} from "@/lib/metrics";

/** Habit untuk laporan: aktif maupun diarsipkan, karena riwayat lama tetap dihitung (FR-03.1). */
export interface ReportHabit extends MetricHabit {
  name: string;
  color: string;
}

export interface HabitRow extends HabitPeriodStats {
  name: string;
  color: string;
}

/** Baris per habit; habit tanpa hari eligible di periode itu tidak ditampilkan. */
function habitRows(
  habits: readonly ReportHabit[],
  index: CompletionIndex,
  from: DateString,
  to: DateString,
  today: DateString,
): HabitRow[] {
  return habits
    .map((habit) => ({ name: habit.name, color: habit.color, ...habitPeriodStats(habit, index, from, to, today) }))
    .filter((row) => row.eligible > 0);
}

/** Satu titik grafik harian; hari di masa depan tetap ada sebagai kolom kosong. */
export interface ChartDay extends DayProgress {
  future: boolean;
}

function chartDays(
  habits: readonly ReportHabit[],
  index: CompletionIndex,
  from: DateString,
  to: DateString,
  today: DateString,
): ChartDay[] {
  return dateRange(from, to).map((date) => ({
    ...dayProgress(habits, index, date, today),
    future: date > today,
  }));
}

// ---------------------------------------------------------------- Mingguan (FR-14)

export interface WeeklyReport {
  from: DateString;
  to: DateString;
  summary: PeriodSummary;
  previousRate: number | null;
  /** Selisih poin persentase dengan periode sebelumnya; null bila salah satu periode kosong. */
  change: number | null;
  days: ChartDay[];
  bestDay: DayProgress | null;
  habits: HabitRow[];
}

export function buildWeeklyReport(
  habits: readonly ReportHabit[],
  index: CompletionIndex,
  from: DateString,
  today: DateString,
): WeeklyReport {
  const to = shiftDate(from, 6);
  const previousFrom = shiftDate(from, -7);
  const previousTo = shiftDate(from, -1);

  const summary = summarizePeriod(habits, index, from, to, today);
  const previous = summarizePeriod(habits, index, previousFrom, previousTo, today);

  return {
    from,
    to,
    summary,
    previousRate: previous.rate,
    change: percentagePointChange(summary.rate, previous.rate),
    days: chartDays(habits, index, from, to, today),
    bestDay: mostProductiveDay(summary.days),
    habits: habitRows(habits, index, from, to, today),
  };
}

// ---------------------------------------------------------------- Bulanan (FR-15)

export interface MonthPoint {
  month: number;
  checked: number;
  eligible: number;
  rate: number | null;
}

export interface MonthlyReport {
  year: number;
  month: number;
  /** Januari–Desember; bulan tanpa habit-day eligible bernilai rate null (kosong, bukan 0%). */
  months: MonthPoint[];
  summary: PeriodSummary;
  habits: HabitRow[];
  best: HabitRow | null;
  /** Habit dengan tingkat terendah; null bila tidak lebih rendah dari yang terbaik. */
  needsAttention: HabitRow | null;
}

export function buildMonthlyReport(
  habits: readonly ReportHabit[],
  index: CompletionIndex,
  year: number,
  month: number,
  today: DateString,
): MonthlyReport {
  const months = Array.from({ length: 12 }, (_, i) => {
    const { from, to } = monthBounds(year, i + 1);
    const { checked, eligible, rate } = summarizePeriod(habits, index, from, to, today);
    return { month: i + 1, checked, eligible, rate };
  });

  const { from, to } = monthBounds(year, month);
  const rows = habitRows(habits, index, from, to, today);

  // Rasio dibandingkan dengan perkalian silang (bebas galat desimal); seri → centang lebih banyak → urutan awal.
  const ratioCompare = (a: HabitRow, b: HabitRow) => a.checked * b.eligible - b.checked * a.eligible;
  let best: HabitRow | null = null;
  let worst: HabitRow | null = null;
  for (const row of rows) {
    if (!best || ratioCompare(row, best) > 0 || (ratioCompare(row, best) === 0 && row.checked > best.checked)) best = row;
    if (!worst || ratioCompare(row, worst) < 0 || (ratioCompare(row, worst) === 0 && row.checked < worst.checked)) worst = row;
  }

  return {
    year,
    month,
    months,
    summary: summarizePeriod(habits, index, from, to, today),
    habits: rows,
    best,
    needsAttention: best && worst && ratioCompare(worst, best) < 0 ? worst : null,
  };
}

// ---------------------------------------------------------------- Tahunan (FR-16)

export interface HeatmapDay {
  date: DateString;
  checked: number;
  eligible: number;
  level: 0 | 1 | 2 | 3 | 4;
  future: boolean;
}

export interface YearlyReport {
  year: number;
  summary: PeriodSummary;
  heatmap: HeatmapDay[];
  weekdays: WeekdayAverage[];
  habits: HabitRow[];
}

export function buildYearlyReport(
  habits: readonly ReportHabit[],
  index: CompletionIndex,
  year: number,
  today: DateString,
): YearlyReport {
  const { from, to } = yearBounds(year);
  const summary = summarizePeriod(habits, index, from, to, today);
  const byDate = new Map(summary.days.map((day) => [day.date, day]));

  const heatmap = dateRange(from, to).map((date): HeatmapDay => {
    const day = byDate.get(date);
    return day
      ? { date, checked: day.checked, eligible: day.eligible, level: heatmapLevel(day.checked, day.eligible), future: false }
      : { date, checked: 0, eligible: 0, level: 0, future: true };
  });

  return {
    year,
    summary,
    heatmap,
    weekdays: weekdayPattern(summary.days),
    habits: habitRows(habits, index, from, to, today),
  };
}

/** Indeks baris heatmap: 0 = Senin ... 6 = Minggu. */
export const mondayFirstRow = (date: DateString) => (dayOfWeek(date) + 6) % 7;
