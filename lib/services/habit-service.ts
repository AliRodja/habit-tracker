import { parseHabitLimit } from "@/lib/constants";
import { db } from "@/lib/db";
import type { DateString } from "@/lib/dates";
import { fieldErrorsOf, habitInputSchema, type FieldErrors } from "@/lib/validation/habit";
import type { Habit } from "@/lib/generated/prisma/client";

export type ServiceResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; message: string; fieldErrors?: FieldErrors };

const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const fail = (message: string, fieldErrors?: FieldErrors): ServiceResult<never> => ({ ok: false, message, fieldErrors });

/** Batas habit aktif dibaca di dalam transaksi yang sama dengan penghitungan habit aktif. */
async function activeLimit(client: Pick<typeof db, "setting">): Promise<number> {
  const row = await client.setting.findUnique({ where: { key: "maxActiveHabits" } });
  return parseHabitLimit(row?.value);
}

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function listActiveHabits(): Promise<Habit[]> {
  return db.habit.findMany({ where: { isActive: true }, orderBy: { orderIndex: "asc" } });
}

/** Arsip diurutkan dari yang terbaru dinonaktifkan. */
export function listArchivedHabits(): Promise<Habit[]> {
  return db.habit.findMany({ where: { isActive: false }, orderBy: [{ archivedAt: "desc" }, { name: "asc" }] });
}

/** FR-01. Input mentah dari form divalidasi di sini (validasi server, NFR-02). */
export async function createHabit(raw: unknown, today: DateString): Promise<ServiceResult<Habit>> {
  const parsed = habitInputSchema(today).safeParse(raw);
  if (!parsed.success) return fail("Periksa kembali isian Anda.", fieldErrorsOf(parsed.error));

  return db.$transaction(async (tx) => {
    const active = await tx.habit.findMany({ where: { isActive: true }, select: { name: true, orderIndex: true } });
    const limit = await activeLimit(tx);
    if (active.length >= limit) {
      return fail(`Batas ${limit} habit aktif tercapai. Arsipkan salah satu terlebih dahulu, atau naikkan batasnya di Pengaturan.`);
    }
    if (active.some((h) => sameName(h.name, parsed.data.name))) {
      return fail("Periksa kembali isian Anda.", { name: ["Nama sudah digunakan"] });
    }
    const orderIndex = active.reduce((max, h) => Math.max(max, h.orderIndex), -1) + 1;
    return ok(await tx.habit.create({ data: { ...parsed.data, orderIndex } }));
  });
}

/** FR-02. Catatan lama tidak dihapus saat Tanggal Mulai digeser; metrik yang mengabaikannya. */
export async function updateHabit(id: string, raw: unknown, today: DateString): Promise<ServiceResult<Habit>> {
  const parsed = habitInputSchema(today).safeParse(raw);
  if (!parsed.success) return fail("Periksa kembali isian Anda.", fieldErrorsOf(parsed.error));

  return db.$transaction(async (tx) => {
    const habit = await tx.habit.findUnique({ where: { id } });
    if (!habit) return fail("Habit tidak ditemukan.");

    if (habit.isActive) {
      const others = await tx.habit.findMany({ where: { isActive: true, NOT: { id } }, select: { name: true } });
      if (others.some((h) => sameName(h.name, parsed.data.name))) {
        return fail("Periksa kembali isian Anda.", { name: ["Nama sudah digunakan"] });
      }
    }
    return ok(await tx.habit.update({ where: { id }, data: parsed.data }));
  });
}

/** FR-03.1. Riwayat tetap tersimpan; urutan habit aktif dirapatkan kembali. */
export async function archiveHabit(id: string, today: DateString): Promise<ServiceResult> {
  return db.$transaction(async (tx) => {
    const habit = await tx.habit.findUnique({ where: { id } });
    if (!habit) return fail("Habit tidak ditemukan.");
    if (!habit.isActive) return fail("Habit sudah nonaktif.");

    await tx.habit.update({ where: { id }, data: { isActive: false, archivedAt: today } });

    const remaining = await tx.habit.findMany({ where: { isActive: true }, orderBy: { orderIndex: "asc" } });
    for (const [orderIndex, h] of remaining.entries()) {
      if (h.orderIndex !== orderIndex) await tx.habit.update({ where: { id: h.id }, data: { orderIndex } });
    }
    return ok(undefined);
  });
}

/** FR-03.2. Hanya bila habit aktif < 5; ditempatkan di urutan terakhir. */
export async function restoreHabit(id: string): Promise<ServiceResult> {
  return db.$transaction(async (tx) => {
    const habit = await tx.habit.findUnique({ where: { id } });
    if (!habit) return fail("Habit tidak ditemukan.");
    if (habit.isActive) return fail("Habit sudah aktif.");

    const active = await tx.habit.findMany({ where: { isActive: true }, select: { name: true, orderIndex: true } });
    const limit = await activeLimit(tx);
    if (active.length >= limit) {
      return fail(`Batas ${limit} habit aktif tercapai. Arsipkan habit lain terlebih dahulu, atau naikkan batasnya di Pengaturan.`);
    }
    if (active.some((h) => sameName(h.name, habit.name))) {
      return fail("Sudah ada habit aktif dengan nama yang sama. Ubah nama salah satunya terlebih dahulu.");
    }
    const orderIndex = active.reduce((max, h) => Math.max(max, h.orderIndex), -1) + 1;
    await tx.habit.update({ where: { id }, data: { isActive: true, archivedAt: null, orderIndex } });
    return ok(undefined);
  });
}

/** FR-04. Hanya habit nonaktif, dan pengguna harus mengetik nama persis. Catatan ikut terhapus (cascade). */
export async function deleteHabit(id: string, confirmName: string): Promise<ServiceResult> {
  const habit = await db.habit.findUnique({ where: { id } });
  if (!habit) return fail("Habit tidak ditemukan.");
  if (habit.isActive) return fail("Hanya habit nonaktif yang dapat dihapus permanen.");
  if (confirmName !== habit.name) return fail("Nama yang diketik tidak sesuai.");

  await db.habit.delete({ where: { id } });
  return ok(undefined);
}

/** FR-05. `orderedIds` harus tepat memuat seluruh habit aktif. */
export async function reorderHabits(orderedIds: string[]): Promise<ServiceResult> {
  return db.$transaction(async (tx) => {
    const active = await tx.habit.findMany({ where: { isActive: true }, select: { id: true } });
    const activeIds = new Set(active.map((h) => h.id));
    const valid =
      orderedIds.length === activeIds.size &&
      new Set(orderedIds).size === orderedIds.length &&
      orderedIds.every((id) => activeIds.has(id));
    if (!valid) return fail("Urutan tidak valid. Muat ulang halaman lalu coba lagi.");

    for (const [orderIndex, id] of orderedIds.entries()) {
      await tx.habit.update({ where: { id }, data: { orderIndex } });
    }
    return ok(undefined);
  });
}

/** Seluruh habit untuk laporan: aktif menurut urutan, lalu arsip menurut nama. */
export async function listAllHabits(): Promise<Habit[]> {
  const [active, archived] = await Promise.all([listActiveHabits(), listArchivedHabits()]);
  return [...active, ...archived.sort((a, b) => a.name.localeCompare(b.name))];
}
