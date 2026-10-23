import type { DateString } from "@/lib/dates";
import { computeGamification, type GamificationSummary } from "@/lib/gamification";
import { buildCompletionIndex } from "@/lib/metrics";
import { listAllHabits } from "./habit-service";
import { getCompletedRecords } from "./record-service";

/** FR-21–FR-24: api, XP, level, dan pencapaian dari seluruh riwayat (termasuk habit di arsip). */
export async function getGamification(today: DateString): Promise<GamificationSummary> {
  const habits = await listAllHabits();
  const records = await getCompletedRecords(habits.map((h) => h.id));
  return computeGamification(habits, buildCompletionIndex(records), today);
}
