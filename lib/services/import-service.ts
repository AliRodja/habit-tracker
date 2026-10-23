import { db } from "@/lib/db";
import type { DateString } from "@/lib/dates";
import { buildImportPlan, parseImportText, type ExistingState, type ImportMode, type ImportPlan } from "@/lib/io/plan";
import { writeBackup } from "./backup-service";
import { getActiveHabitLimit } from "./settings-store";

const CHUNK = 500;

export async function loadExistingState(): Promise<ExistingState> {
  const [habits, records, maxActive] = await Promise.all([
    db.habit.findMany({ select: { id: true, name: true, isActive: true } }),
    db.habitRecord.findMany({ select: { habitId: true, date: true } }),
    getActiveHabitLimit(),
  ]);
  return { habits, recordKeys: new Set(records.map((r) => `${r.habitId}|${r.date}`)), maxActive };
}

/** FR-19.2: validasi dan pratinjau tanpa menyimpan apa pun (dryRun). */
export async function previewImport(text: string, filename: string, mode: ImportMode, today: DateString): Promise<ImportPlan> {
  return buildImportPlan(parseImportText(text, filename), await loadExistingState(), mode, today);
}

export interface ImportOutcome {
  plan: ImportPlan;
  applied: boolean;
  /** Cadangan otomatis yang dibuat sebelum mode Ganti. */
  backupPath?: string;
}

/** Validasi ulang lalu terapkan. Mode Ganti membuat cadangan JSON terlebih dahulu (FR-19.4). */
export async function runImport(
  text: string,
  filename: string,
  mode: ImportMode,
  today: DateString,
  options: { backupDir?: string } = {},
): Promise<ImportOutcome> {
  const plan = await previewImport(text, filename, mode, today);
  if (!plan.canApply) return { plan, applied: false };

  const backupPath = mode === "replace" ? await writeBackup("sebelum-impor", options.backupDir) : undefined;
  await executeImportPlan(plan);
  return { plan, applied: true, backupPath };
}

const chunks = <T,>(items: T[]): T[][] => Array.from({ length: Math.ceil(items.length / CHUNK) }, (_, i) => items.slice(i * CHUNK, (i + 1) * CHUNK));

/** FR-19.5: seluruh perubahan dalam satu transaksi; bila ada yang gagal, tidak ada data yang berubah. */
export async function executeImportPlan(plan: ImportPlan): Promise<void> {
  await db.$transaction(
    async (tx) => {
      if (plan.mode === "replace") {
        await tx.habitRecord.deleteMany();
        await tx.habit.deleteMany();
        if (plan.settings) await tx.setting.deleteMany();
      }

      for (const { id, ...data } of plan.habits) {
        if (plan.mode === "replace") await tx.habit.create({ data: { id, ...data } });
        else await tx.habit.upsert({ where: { id }, create: { id, ...data }, update: data });
      }

      if (plan.mode === "replace") {
        for (const batch of chunks(plan.records)) await tx.habitRecord.createMany({ data: batch });
      } else {
        const habitIds = [...new Set(plan.records.map((r) => r.habitId))];
        const existing = await tx.habitRecord.findMany({
          where: { habitId: { in: habitIds } },
          select: { id: true, habitId: true, date: true },
        });
        const idByKey = new Map(existing.map((r) => [`${r.habitId}|${r.date}`, r.id]));

        const toCreate = plan.records.filter((r) => !idByKey.has(`${r.habitId}|${r.date}`));
        for (const batch of chunks(toCreate)) await tx.habitRecord.createMany({ data: batch });
        for (const r of plan.records) {
          const id = idByKey.get(`${r.habitId}|${r.date}`);
          if (id) await tx.habitRecord.update({ where: { id }, data: { completed: r.completed, note: r.note } });
        }
      }

      if (plan.settings) {
        await tx.setting.createMany({
          data: Object.entries(plan.settings).map(([key, value]) => ({ key, value: String(value) })),
        });
      }

      // Rapatkan urutan habit aktif agar tidak ada indeks ganda setelah penggabungan.
      const active = await tx.habit.findMany({ where: { isActive: true }, orderBy: [{ orderIndex: "asc" }, { name: "asc" }] });
      for (const [orderIndex, habit] of active.entries()) {
        if (habit.orderIndex !== orderIndex) await tx.habit.update({ where: { id: habit.id }, data: { orderIndex } });
      }
    },
    { timeout: 120_000, maxWait: 10_000 },
  );
}
