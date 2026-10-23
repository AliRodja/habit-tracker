import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import type { Theme } from "@/lib/constants";
import { db } from "@/lib/db";
import { EXPORT_APP, EXPORT_SCHEMA_VERSION, type ExportFile } from "@/lib/io/schema";
import { getSettings } from "./settings-store";

/** FR-18.1: cadangan lengkap (habit termasuk arsip, catatan, dan pengaturan) dengan urutan deterministik. */
export async function buildExportFile(now: Date = new Date()): Promise<ExportFile> {
  const [settings, habits, records] = await Promise.all([
    getSettings(),
    db.habit.findMany({ orderBy: [{ orderIndex: "asc" }, { name: "asc" }] }),
    db.habitRecord.findMany({ orderBy: [{ date: "asc" }, { habitId: "asc" }] }),
  ]);

  return {
    app: EXPORT_APP,
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: format(new TZDate(now, settings.timezone), "yyyy-MM-dd'T'HH:mm:ssxxx"),
    settings: { timezone: settings.timezone, weekStartsOn: settings.weekStartsOn as "0" | "1", theme: settings.theme as Theme, maxActiveHabits: settings.maxActiveHabits, gamification: settings.gamification === "off" ? "off" : "on" },
    habits: habits.map((h) => ({
      id: h.id,
      name: h.name,
      description: h.description,
      target: h.target,
      color: h.color as ExportFile["habits"][number]["color"],
      orderIndex: h.orderIndex,
      isActive: h.isActive,
      startDate: h.startDate,
      archivedAt: h.archivedAt,
    })),
    records: records.map((r) => ({ habitId: r.habitId, date: r.date, completed: r.completed, note: r.note })),
  };
}

/** Penanda waktu untuk nama berkas dalam zona waktu pengguna: YYYYMMDD-HHmm (FR-18.4). */
export function fileStamp(timeZone: string, now: Date = new Date(), withSeconds = false): string {
  return format(new TZDate(now, timeZone), withSeconds ? "yyyyMMdd-HHmmss" : "yyyyMMdd-HHmm");
}
