import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import * as habits from "@/lib/services/habit-service";
import * as records from "@/lib/services/record-service";

const today = "2026-10-23";

async function makeHabit(name = "Membaca", startDate = "2026-10-01") {
  const result = await habits.createHabit({ name, target: "", description: "", color: "violet", startDate }, today);
  if (!result.ok) throw new Error(result.message);
  return result.data;
}

const find = (habitId: string, date: string) => db.habitRecord.findUnique({ where: { habitId_date: { habitId, date } } });

beforeEach(async () => {
  await db.habitRecord.deleteMany();
  await db.habit.deleteMany();
});

describe("setRecord", () => {
  it("TC-05: mencentang hari ini membuat catatan completed=true", async () => {
    const h = await makeHabit();
    expect((await records.setRecord(h.id, today, true, today)).ok).toBe(true);
    expect(await find(h.id, today)).toMatchObject({ completed: true });
  });

  it("TC-06: backfill tanggal lalu tersimpan", async () => {
    const h = await makeHabit();
    expect((await records.setRecord(h.id, "2026-10-20", true, today)).ok).toBe(true);
    expect(await find(h.id, "2026-10-20")).toMatchObject({ completed: true });
  });

  it("TC-07: tanggal masa depan ditolak server", async () => {
    const h = await makeHabit();
    const result = await records.setRecord(h.id, "2026-10-24", true, today);
    expect(result).toMatchObject({ ok: false });
    expect(await find(h.id, "2026-10-24")).toBeNull();
  });

  it("menolak tanggal sebelum tanggal mulai habit", async () => {
    const h = await makeHabit("Membaca", "2026-10-15");
    expect((await records.setRecord(h.id, "2026-10-14", true, today)).ok).toBe(false);
    expect((await records.setRecord(h.id, "2026-10-15", true, today)).ok).toBe(true);
  });

  it("menolak habit tidak dikenal dan tanggal tidak valid", async () => {
    const h = await makeHabit();
    expect((await records.setRecord("tidak-ada", today, true, today)).ok).toBe(false);
    expect((await records.setRecord(h.id, "2026-02-30", true, today)).ok).toBe(false);
    expect((await records.setRecord(h.id, "kemarin", true, today)).ok).toBe(false);
  });

  it("NFR-08: mencentang berulang tidak menggandakan catatan (unique habit+tanggal)", async () => {
    const h = await makeHabit();
    await records.setRecord(h.id, today, true, today);
    await records.setRecord(h.id, today, true, today);
    await records.setRecord(h.id, today, false, today);
    await records.setRecord(h.id, today, true, today);
    expect(await db.habitRecord.count({ where: { habitId: h.id, date: today } })).toBe(1);
  });

  it("menghapus centang mempertahankan catatan", async () => {
    const h = await makeHabit();
    await records.setRecord(h.id, today, true, today);
    await records.setRecordNote(h.id, today, "enak sekali", today);
    await records.setRecord(h.id, today, false, today);
    expect(await find(h.id, today)).toMatchObject({ completed: false, note: "enak sekali" });
  });

  it("habit yang sudah diarsipkan tidak dapat dicatat pada/ setelah tanggal arsip", async () => {
    const h = await makeHabit();
    await habits.archiveHabit(h.id, "2026-10-20");
    expect((await records.setRecord(h.id, "2026-10-20", true, today)).ok).toBe(false);
    expect((await records.setRecord(h.id, "2026-10-19", true, today)).ok).toBe(true);
  });
});

describe("setRecordNote (FR-10)", () => {
  it("catatan pada sel kosong membuat catatan completed=false", async () => {
    const h = await makeHabit();
    expect((await records.setRecordNote(h.id, today, "  hujan  ", today)).ok).toBe(true);
    expect(await find(h.id, today)).toMatchObject({ completed: false, note: "hujan" });
  });

  it("menolak catatan lebih dari 200 karakter", async () => {
    const h = await makeHabit();
    expect(await records.setRecordNote(h.id, today, "x".repeat(201), today)).toMatchObject({ ok: false });
    expect((await records.setRecordNote(h.id, today, "x".repeat(200), today)).ok).toBe(true);
  });

  it("mengosongkan catatan pada sel belum tercentang menghapus barisnya", async () => {
    const h = await makeHabit();
    await records.setRecordNote(h.id, today, "sementara", today);
    await records.setRecordNote(h.id, today, "", today);
    expect(await find(h.id, today)).toBeNull();
  });

  it("mengosongkan catatan pada sel tercentang mempertahankan centang", async () => {
    const h = await makeHabit();
    await records.setRecord(h.id, today, true, today);
    await records.setRecordNote(h.id, today, "ada", today);
    await records.setRecordNote(h.id, today, "", today);
    expect(await find(h.id, today)).toMatchObject({ completed: true, note: null });
  });

  it("menolak tanggal masa depan", async () => {
    const h = await makeHabit();
    expect((await records.setRecordNote(h.id, "2026-10-24", "x", today)).ok).toBe(false);
  });
});

describe("getRecordsBetween", () => {
  it("hanya mengembalikan catatan dalam rentang (inklusif)", async () => {
    const h = await makeHabit();
    for (const d of ["2026-10-09", "2026-10-10", "2026-10-20", "2026-10-21"]) await records.setRecord(h.id, d, true, today);
    const rows = await records.getRecordsBetween("2026-10-10", "2026-10-20");
    expect(rows.map((r) => r.date).sort()).toEqual(["2026-10-10", "2026-10-20"]);
  });
});
