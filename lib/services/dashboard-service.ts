import type { DateString } from "@/lib/dates";
import { buildCompletionIndex, currentStreak, milestoneProgress, type MetricHabit } from "@/lib/metrics";
import { HABIT_MILESTONE_DAYS } from "@/lib/constants";
import type { Habit } from "@/lib/generated/prisma/client";
import { listActiveHabits } from "./habit-service";
import { getCompletedRecords } from "./record-service";

export interface TodayItem {
  habit: Pick<Habit, "id" | "name" | "target" | "color">;
  checkedToday: boolean;
  /**
   * Streak dan total hari dihitung untuk dua kemungkinan status hari ini, sehingga UI dapat
   * menampilkan angka yang benar secara optimistik tanpa menunggu server.
   */
  streak: { ifChecked: number; ifUnchecked: number };
  completedDays: { ifChecked: number; ifUnchecked: number };
  milestoneTarget: number;
}

/** FR-06: data kartu check-in Hari Ini. */
export async function getTodayItems(today: DateString): Promise<TodayItem[]> {
  const habits = await listActiveHabits();
  const records = await getCompletedRecords(habits.map((h) => h.id));
  const base = buildCompletionIndex(records);

  return habits.map((habit) => {
    const metricHabit: MetricHabit = habit;
    const key = `${habit.id}|${today}`;
    const checkedToday = base.has(key);

    const withToday = new Set(base).add(key);
    const withoutToday = new Set(base);
    withoutToday.delete(key);

    return {
      habit: { id: habit.id, name: habit.name, target: habit.target, color: habit.color },
      checkedToday,
      streak: {
        ifChecked: currentStreak(metricHabit, withToday, today),
        ifUnchecked: currentStreak(metricHabit, withoutToday, today),
      },
      completedDays: {
        ifChecked: milestoneProgress(metricHabit, withToday, today).completedDays,
        ifUnchecked: milestoneProgress(metricHabit, withoutToday, today).completedDays,
      },
      milestoneTarget: HABIT_MILESTONE_DAYS,
    };
  });
}
