import type { ExportFile, ExportHabit, ExportRecord } from "@/lib/io/schema";

export const habit = (id: string, name: string, extra: Partial<ExportHabit> = {}): ExportHabit => ({
  id,
  name,
  description: null,
  target: null,
  color: "sky",
  orderIndex: 0,
  isActive: true,
  startDate: "2026-01-01",
  archivedAt: null,
  ...extra,
});

export const record = (habitId: string, date: string, extra: Partial<ExportRecord> = {}): ExportRecord => ({
  habitId,
  date,
  completed: true,
  note: null,
  ...extra,
});

export const exportFile = (habits: ExportHabit[], records: ExportRecord[], extra: Partial<ExportFile> = {}): ExportFile => ({
  app: "daily-habit-tracker",
  schemaVersion: 1,
  exportedAt: "2026-10-23T22:30:00+07:00",
  habits,
  records,
  ...extra,
});
