import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import * as habits from "@/lib/services/habit-service";

const today = "2026-10-23";
const valid = { name: "Membaca", target: "", description: "", color: "violet", startDate: today };

async function create(name: string, extra: Record<string, unknown> = {}) {
  const result = await habits.createHabit({ ...valid, name, ...extra }, today);
  if (!result.ok) throw new Error(`gagal membuat ${name}: ${result.message}`);
  return result.data;
}

const activeNames = async () => (await habits.listActiveHabits()).map((h) => h.name);

beforeEach(async () => {
  await db.habitRecord.deleteMany();
  await db.habit.deleteMany();
});

describe("createHabit (FR-01)", () => {
  it("TC-01: habit valid muncul di urutan terakhir", async () => {
    await create("Minum Air");
    const result = await habits.createHabit(valid, today);
    expect(result.ok).toBe(true);
    expect(await activeNames()).toEqual(["Minum Air", "Membaca"]);
    expect((await habits.listActiveHabits()).map((h) => h.orderIndex)).toEqual([0, 1]);
  });

  it("menormalkan field opsional kosong menjadi null dan memangkas spasi nama", async () => {
    const habit = await create("  Olahraga  ", { target: "  ", description: "" });
    expect(habit).toMatchObject({ name: "Olahraga", target: null, description: null, isActive: true, archivedAt: null });
  });

  it("TC-02: nama kosong ditolak dengan pesan di kolom nama", async () => {
    const result = await habits.createHabit({ ...valid, name: "   " }, today);
    expect(result).toMatchObject({ ok: false, fieldErrors: { name: ["Nama wajib diisi"] } });
    expect(await db.habit.count()).toBe(0);
  });

  it("TC-03: habit ke-6 ditolak", async () => {
    for (const name of ["A", "B", "C", "D", "E"]) await create(name);
    const result = await habits.createHabit({ ...valid, name: "F" }, today);
    expect(result).toMatchObject({ ok: false });
    expect(!result.ok && result.message).toMatch(/Batas 5 habit aktif/);
    expect(await db.habit.count()).toBe(5);
  });

  it("TC-04: nama duplikat tidak peka huruf besar/kecil", async () => {
    await create("Minum Air");
    const result = await habits.createHabit({ ...valid, name: "minum air" }, today);
    expect(result).toMatchObject({ ok: false, fieldErrors: { name: ["Nama sudah digunakan"] } });
  });

  it("nama habit nonaktif boleh dipakai ulang", async () => {
    const old = await create("Minum Air");
    await habits.archiveHabit(old.id, today);
    expect((await habits.createHabit({ ...valid, name: "Minum Air" }, today)).ok).toBe(true);
  });

  it("menolak tanggal mulai di masa depan, tanggal tidak ada, warna di luar palet, dan batas panjang", async () => {
    const cases: [Record<string, unknown>, string][] = [
      [{ startDate: "2026-10-24" }, "startDate"],
      [{ startDate: "2026-02-30" }, "startDate"],
      [{ color: "magenta" }, "color"],
      [{ name: "x".repeat(51) }, "name"],
      [{ target: "x".repeat(51) }, "target"],
      [{ description: "x".repeat(201) }, "description"],
    ];
    for (const [override, field] of cases) {
      const result = await habits.createHabit({ ...valid, ...override }, today);
      expect(result.ok, field).toBe(false);
      expect(!result.ok && result.fieldErrors?.[field], field).toBeTruthy();
    }
    expect(await db.habit.count()).toBe(0);
  });
});

describe("updateHabit (FR-02)", () => {
  it("mengubah atribut dan mempertahankan catatan lama saat tanggal mulai digeser", async () => {
    const habit = await create("Membaca", { startDate: "2026-10-01" });
    await db.habitRecord.create({ data: { habitId: habit.id, date: "2026-10-02" } });

    const result = await habits.updateHabit(habit.id, { ...valid, name: "Membaca Buku", startDate: "2026-10-10" }, today);
    expect(result).toMatchObject({ ok: true, data: { name: "Membaca Buku", startDate: "2026-10-10" } });
    expect(await db.habitRecord.count()).toBe(1);
  });

  it("menyimpan ulang dengan nama sendiri tidak dianggap duplikat", async () => {
    const habit = await create("Membaca");
    expect((await habits.updateHabit(habit.id, { ...valid, color: "rose" }, today)).ok).toBe(true);
  });

  it("menolak nama yang dipakai habit aktif lain", async () => {
    await create("Olahraga");
    const habit = await create("Membaca");
    const result = await habits.updateHabit(habit.id, { ...valid, name: "OLAHRAGA" }, today);
    expect(result).toMatchObject({ ok: false, fieldErrors: { name: ["Nama sudah digunakan"] } });
  });

  it("habit yang tidak ada", async () => {
    expect(await habits.updateHabit("tidak-ada", valid, today)).toMatchObject({ ok: false });
  });
});

describe("archiveHabit & restoreHabit (FR-03)", () => {
  it("TC-10: arsip mengisi archivedAt, menyimpan riwayat, dan merapatkan urutan", async () => {
    const a = await create("A");
    const b = await create("B");
    await create("C");
    await db.habitRecord.create({ data: { habitId: b.id, date: "2026-10-20" } });

    expect((await habits.archiveHabit(b.id, today)).ok).toBe(true);

    expect(await db.habit.findUnique({ where: { id: b.id } })).toMatchObject({ isActive: false, archivedAt: today });
    expect(await db.habitRecord.count({ where: { habitId: b.id } })).toBe(1);
    const active = await habits.listActiveHabits();
    expect(active.map((h) => [h.name, h.orderIndex])).toEqual([["A", 0], ["C", 1]]);
    expect((await habits.listArchivedHabits()).map((h) => h.id)).toEqual([b.id]);
    expect(a.id).toBeTruthy();
  });

  it("restore mengosongkan archivedAt dan menaruh habit di urutan terakhir", async () => {
    const a = await create("A");
    await create("B");
    await habits.archiveHabit(a.id, today);

    expect((await habits.restoreHabit(a.id)).ok).toBe(true);
    expect(await db.habit.findUnique({ where: { id: a.id } })).toMatchObject({ isActive: true, archivedAt: null });
    expect(await activeNames()).toEqual(["B", "A"]);
  });

  it("restore ditolak bila sudah ada 5 habit aktif", async () => {
    const old = await create("Lama");
    await habits.archiveHabit(old.id, today);
    for (const name of ["A", "B", "C", "D", "E"]) await create(name);
    const result = await habits.restoreHabit(old.id);
    expect(result).toMatchObject({ ok: false });
    expect((await habits.listActiveHabits()).length).toBe(5);
  });

  it("restore ditolak bila nama bentrok dengan habit aktif", async () => {
    const old = await create("Minum Air");
    await habits.archiveHabit(old.id, today);
    await create("minum air");
    expect(await habits.restoreHabit(old.id)).toMatchObject({ ok: false });
  });

  it("arsip dua kali dan restore habit aktif ditolak", async () => {
    const a = await create("A");
    expect((await habits.restoreHabit(a.id)).ok).toBe(false);
    await habits.archiveHabit(a.id, today);
    expect((await habits.archiveHabit(a.id, today)).ok).toBe(false);
  });
});

describe("deleteHabit (FR-04)", () => {
  it("hanya untuk habit nonaktif", async () => {
    const a = await create("A");
    expect(await habits.deleteHabit(a.id, "A")).toMatchObject({ ok: false });
    expect(await db.habit.count()).toBe(1);
  });

  it("nama konfirmasi harus persis sama", async () => {
    const a = await create("Minum Air");
    await habits.archiveHabit(a.id, today);
    expect(await habits.deleteHabit(a.id, "minum air")).toMatchObject({ ok: false });
    expect(await db.habit.count()).toBe(1);
  });

  it("menghapus habit beserta seluruh catatannya (cascade)", async () => {
    const a = await create("Minum Air");
    await db.habitRecord.createMany({
      data: [{ habitId: a.id, date: "2026-10-01" }, { habitId: a.id, date: "2026-10-02" }],
    });
    await habits.archiveHabit(a.id, today);

    expect((await habits.deleteHabit(a.id, "Minum Air")).ok).toBe(true);
    expect(await db.habit.count()).toBe(0);
    expect(await db.habitRecord.count()).toBe(0);
  });
});

describe("reorderHabits (FR-05)", () => {
  it("mengubah urutan sesuai daftar id", async () => {
    const a = await create("A");
    const b = await create("B");
    const c = await create("C");
    expect((await habits.reorderHabits([c.id, a.id, b.id])).ok).toBe(true);
    expect(await activeNames()).toEqual(["C", "A", "B"]);
  });

  it("menolak daftar yang tidak lengkap, duplikat, atau berisi id asing", async () => {
    const a = await create("A");
    const b = await create("B");
    expect((await habits.reorderHabits([a.id])).ok).toBe(false);
    expect((await habits.reorderHabits([a.id, a.id])).ok).toBe(false);
    expect((await habits.reorderHabits([a.id, "asing"])).ok).toBe(false);
    expect(await activeNames()).toEqual(["A", "B"]);
    expect(b.id).toBeTruthy();
  });

  it("habit nonaktif tidak boleh ikut diurutkan", async () => {
    const a = await create("A");
    const b = await create("B");
    await habits.archiveHabit(b.id, today);
    expect((await habits.reorderHabits([a.id, b.id])).ok).toBe(false);
  });
});
