import { db } from "@/lib/db";
import { isDateString, type DateString } from "@/lib/dates";
import type { GridRecord } from "@/lib/grid";
import { isEligible } from "@/lib/metrics";
import { noteSchema } from "@/lib/validation/habit";
import type { Habit } from "@/lib/generated/prisma/client";
import type { ServiceResult } from "./habit-service";

const fail = (message: string): ServiceResult<never> => ({ ok: false, message });

/** Validasi bersama FR-09: tanggal sah, bukan masa depan, dan habit eligible pada tanggal itu. */
async function checkWritable(habitId: string, date: string, today: DateString): Promise<ServiceResult<Habit>> {
  if (!isDateString(date)) return fail("Tanggal tidak valid.");
  if (date > today) return fail("Tanggal di masa depan tidak dapat dicatat.");

  const habit = await db.habit.findUnique({ where: { id: habitId } });
  if (!habit) return fail("Habit tidak ditemukan.");
  if (!isEligible(habit, date, today)) return fail("Tanggal ini di luar rentang aktif habit tersebut.");
  return { ok: true, data: habit };
}

/** FR-06, FR-09. Mencentang = upsert completed=true; menghapus centang = completed=false (catatan tetap). */
export async function setRecord(
  habitId: string,
  date: string,
  completed: boolean,
  today: DateString,
): Promise<ServiceResult> {
  const writable = await checkWritable(habitId, date, today);
  if (!writable.ok) return writable;

  await db.habitRecord.upsert({
    where: { habitId_date: { habitId, date } },
    create: { habitId, date, completed },
    update: { completed },
  });
  return { ok: true, data: undefined };
}

/** FR-10. Catatan maks. 200 karakter; baris yang tidak tercentang dan tanpa catatan dihapus. */
export async function setRecordNote(
  habitId: string,
  date: string,
  rawNote: string,
  today: DateString,
): Promise<ServiceResult> {
  const parsed = noteSchema.safeParse(rawNote);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Catatan tidak valid." };
  const note = parsed.data;

  const writable = await checkWritable(habitId, date, today);
  if (!writable.ok) return writable;

  const existing = await db.habitRecord.findUnique({ where: { habitId_date: { habitId, date } } });
  if (note === null) {
    if (existing && existing.completed) {
      await db.habitRecord.update({ where: { id: existing.id }, data: { note: null } });
    } else if (existing) {
      await db.habitRecord.delete({ where: { id: existing.id } });
    }
    return { ok: true, data: undefined };
  }

  await db.habitRecord.upsert({
    where: { habitId_date: { habitId, date } },
    create: { habitId, date, completed: false, note },
    update: { note },
  });
  return { ok: true, data: undefined };
}

/** Semua catatan dalam rentang tanggal (satu query, lihat Bagian 8 PRD). */
export async function getRecordsBetween(from: DateString, to: DateString): Promise<GridRecord[]> {
  const rows = await db.habitRecord.findMany({
    where: { date: { gte: from, lte: to } },
    select: { habitId: true, date: true, completed: true, note: true },
  });
  return rows;
}

/** Seluruh riwayat centang untuk habit tertentu (dasar perhitungan streak dan tonggak 66 hari). */
export async function getCompletedRecords(habitIds: string[]) {
  return db.habitRecord.findMany({
    where: { habitId: { in: habitIds }, completed: true },
    select: { habitId: true, date: true, completed: true },
  });
}
