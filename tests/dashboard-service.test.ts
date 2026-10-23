import { beforeEach, describe, expect, it } from "vitest";
import { dateRange } from "@/lib/dates";
import { db } from "@/lib/db";
import { getTodayItems } from "@/lib/services/dashboard-service";
import * as habits from "@/lib/services/habit-service";
import * as records from "@/lib/services/record-service";

const today = "2026-10-23";

async function makeHabit(name: string, startDate = "2026-01-01") {
  const result = await habits.createHabit({ name, target: "8 gelas", description: "", color: "sky", startDate }, today);
  if (!result.ok) throw new Error(result.message);
  return result.data;
}

const check = (habitId: string, dates: string[]) =>
  Promise.all(dates.map((d) => records.setRecord(habitId, d, true, today)));

beforeEach(async () => {
  await db.habitRecord.deleteMany();
  await db.habit.deleteMany();
  await db.setting.deleteMany(); // pengaturan (mis. batas habit) dari file tes lain tidak boleh terbawa
});

describe("getTodayItems (FR-06, FR-12, FR-13)", () => {
  it("TC-11: hari ini belum diisi — streak ifUnchecked mengabaikan hari ini, ifChecked menambahnya", async () => {
    const h = await makeHabit("Minum Air");
    await check(h.id, dateRange("2026-10-18", "2026-10-22"));

    const [item] = await getTodayItems(today);
    expect(item.checkedToday).toBe(false);
    expect(item.streak).toEqual({ ifUnchecked: 5, ifChecked: 6 });
    expect(item.completedDays).toEqual({ ifUnchecked: 5, ifChecked: 6 });
  });

  it("hari ini sudah dicentang — kedua nilai tetap konsisten untuk toggle optimistik", async () => {
    const h = await makeHabit("Minum Air");
    await check(h.id, dateRange("2026-10-18", "2026-10-23"));

    const [item] = await getTodayItems(today);
    expect(item.checkedToday).toBe(true);
    expect(item.streak).toEqual({ ifUnchecked: 5, ifChecked: 6 });
  });

  it("TC-12: kemarin terlewat memutus streak meski hari ini dicentang", async () => {
    const h = await makeHabit("Minum Air");
    await check(h.id, ["2026-10-19", "2026-10-20", "2026-10-23"]);

    const [item] = await getTodayItems(today);
    expect(item.streak).toEqual({ ifUnchecked: 0, ifChecked: 1 });
  });

  it("mengikuti urutan habit aktif dan mengabaikan habit nonaktif", async () => {
    const a = await makeHabit("A");
    await makeHabit("B");
    await habits.archiveHabit(a.id, today);
    expect((await getTodayItems(today)).map((i) => i.habit.name)).toEqual(["B"]);
  });

  it("tonggak 66 hari menghitung total hari, bukan streak", async () => {
    const h = await makeHabit("Membaca");
    await check(h.id, dateRange("2026-01-01", "2026-03-07").filter((d) => d !== "2026-02-10"));
    await check(h.id, ["2026-03-08"]);

    const [item] = await getTodayItems(today);
    expect(item.completedDays.ifUnchecked).toBe(66);
    expect(item.milestoneTarget).toBe(66);
  });
});
