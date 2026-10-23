import { monthBounds, shiftDate, startOfWeek, yearBounds, type DateString } from "@/lib/dates";
import { buildCompletionIndex } from "@/lib/metrics";
import { buildMonthlyReport, buildWeeklyReport, buildYearlyReport } from "@/lib/reports";
import { listAllHabits } from "./habit-service";
import { getRecordsBetween } from "./record-service";
import { getSettings } from "./settings-service";

async function load(from: DateString, to: DateString) {
  const [habits, records] = await Promise.all([listAllHabits(), getRecordsBetween(from, to)]);
  return { habits, index: buildCompletionIndex(records) };
}

export type WeeklyMode = "rolling" | "calendar";

/** FR-14.1: "7 hari terakhir" (bergulir) atau minggu kalender menurut awal minggu di Pengaturan. */
export async function getWeeklyReport(mode: WeeklyMode, anchor: DateString, today: DateString) {
  const { weekStartsOn } = await getSettings();
  const from = mode === "rolling" ? shiftDate(today, -6) : startOfWeek(anchor, weekStartsOn === "0" ? 0 : 1);
  const { habits, index } = await load(shiftDate(from, -7), shiftDate(from, 6));
  return { report: buildWeeklyReport(habits, index, from, today), habits, weekStartsOn };
}

export async function getMonthlyReport(year: number, month: number, today: DateString) {
  const { habits, index } = await load(yearBounds(year).from, monthBounds(year, 12).to);
  return buildMonthlyReport(habits, index, year, month, today);
}

export async function getYearlyReport(year: number, today: DateString) {
  const { habits, index } = await load(yearBounds(year).from, yearBounds(year).to);
  return buildYearlyReport(habits, index, year, today);
}

/** Tahun terawal yang memiliki data (dari tanggal mulai habit), untuk batas navigasi. */
export async function getEarliestStartDate(): Promise<DateString | null> {
  const habits = await listAllHabits();
  return habits.reduce<DateString | null>((min, h) => (min === null || h.startDate < min ? h.startDate : min), null);
}
