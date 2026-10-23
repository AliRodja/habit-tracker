import { shiftDate, type DateString } from "@/lib/dates";
import { HABIT_MILESTONE_DAYS } from "@/lib/constants";
import { lastEligibleDate } from "./eligibility";
import { isCompleted, type CompletionIndex, type MetricHabit } from "./types";

export interface MilestoneProgress {
  completedDays: number;
  target: number;
  /** Lencana "Terbentuk". */
  formed: boolean;
}

/**
 * FR-13. Total hari tercentang sejak Tanggal Mulai (bukan streak): menurut Lally dkk.,
 * melewatkan satu hari tidak membatalkan proses pembentukan kebiasaan.
 */
export function milestoneProgress(
  habit: MetricHabit,
  index: CompletionIndex,
  today: DateString,
): MilestoneProgress {
  const last = lastEligibleDate(habit, today);
  let completedDays = 0;
  if (last !== null) {
    for (let date = habit.startDate; date <= last; date = shiftDate(date, 1)) {
      if (isCompleted(index, habit.id, date)) completedDays++;
    }
  }
  return { completedDays, target: HABIT_MILESTONE_DAYS, formed: completedDays >= HABIT_MILESTONE_DAYS };
}
