import type { DateString } from "@/lib/dates";
import { computeGamification, type GamificationSummary } from "@/lib/gamification";
import { buildCompletionIndex } from "@/lib/metrics";
import { listAllHabits } from "./habit-service";
import { getCompletedRecords } from "./record-service";
import { getSettings } from "./settings-store";

export interface HabitInfo {
  name: string;
  color: string;
  isActive: boolean;
}

export interface GamificationView extends GamificationSummary {
  enabled: boolean;
  /** Nama dan warna habit untuk tantangan fokus dan lencana per habit. */
  habitInfo: Record<string, HabitInfo>;
}

/** FR-21–FR-27: api, XP, tantangan, dan pencapaian dari seluruh riwayat (termasuk habit di arsip). */
export async function getGamification(today: DateString): Promise<GamificationView> {
  const [habits, settings] = await Promise.all([listAllHabits(), getSettings()]);
  const records = await getCompletedRecords(habits.map((h) => h.id));
  const summary = computeGamification(habits, buildCompletionIndex(records), today, { weekStartsOn: settings.weekStartsOn === "0" ? 0 : 1 });
  return {
    ...summary,
    enabled: settings.gamification !== "off",
    habitInfo: Object.fromEntries(habits.map((h) => [h.id, { name: h.name, color: h.color, isActive: h.isActive }])),
  };
}
