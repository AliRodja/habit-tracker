import { describe, expect, it } from "vitest";
import { startOfWeek } from "@/lib/dates";
import { buildCompletionIndex } from "@/lib/metrics";
import { buildMonthlyReport, buildWeeklyReport, buildYearlyReport, mondayFirstRow, type ReportHabit } from "@/lib/reports";
import { checkRange, checks, indexOf } from "./metrics/helpers";

const rh = (id: string, startDate: string, archivedAt: string | null = null): ReportHabit => ({
  id,
  name: `Habit ${id}`,
  color: "sky",
  startDate,
  archivedAt,
});

describe("startOfWeek", () => {
  it("Senin sebagai awal minggu", () => {
    expect(startOfWeek("2026-10-23", 1)).toBe("2026-10-19"); // Jumat
    expect(startOfWeek("2026-10-19", 1)).toBe("2026-10-19"); // Senin itu sendiri
    expect(startOfWeek("2026-10-25", 1)).toBe("2026-10-19"); // Minggu masih minggu yang sama
  });

  it("Minggu sebagai awal minggu", () => {
    expect(startOfWeek("2026-10-23", 0)).toBe("2026-10-18");
    expect(startOfWeek("2026-10-18", 0)).toBe("2026-10-18");
  });

  it("melewati pergantian bulan dan tahun", () => {
    expect(startOfWeek("2027-01-01", 1)).toBe("2026-12-28");
  });
});

describe("buildWeeklyReport (FR-14)", () => {
  const habits = [rh("a", "2026-01-01")];
  const today = "2026-10-30";

  it("menghitung tingkat penyelesaian, perbandingan poin persentase, dan tabel per habit", () => {
    const index = indexOf(checkRange("a", "2026-10-12", "2026-10-16"), checkRange("a", "2026-10-05", "2026-10-07"));
    const report = buildWeeklyReport(habits, index, "2026-10-12", today);

    expect(report.summary).toMatchObject({ checked: 5, eligible: 7, activeDays: 5, perfectDays: 5 });
    expect(report.previousRate).toBeCloseTo(3 / 7);
    expect(report.change).toBe(28.6);
    expect(report.habits).toMatchObject([{ habitId: "a", checked: 5, eligible: 7 }]);
    expect(report.days).toHaveLength(7);
  });

  it("TC-14: hari paling produktif — seri dipecah dengan tanggal paling awal", () => {
    const index = indexOf(checks("a", ["2026-10-14", "2026-10-13"]));
    expect(buildWeeklyReport(habits, index, "2026-10-12", today).bestDay?.date).toBe("2026-10-13");
  });

  it("hari setelah Hari Ini muncul sebagai kolom kosong dan tidak masuk penyebut", () => {
    const report = buildWeeklyReport(habits, indexOf(), "2026-10-26", "2026-10-28");
    expect(report.days.map((d) => d.future)).toEqual([false, false, false, true, true, true, true]);
    expect(report.summary.eligible).toBe(3);
  });

  it("perubahan null bila periode sebelumnya belum punya habit eligible", () => {
    const report = buildWeeklyReport([rh("a", "2026-10-12")], indexOf(checks("a", ["2026-10-12"])), "2026-10-12", today);
    expect(report.previousRate).toBeNull();
    expect(report.change).toBeNull();
  });

  it("habit yang diarsipkan sebelum periode tidak muncul di tabel", () => {
    const report = buildWeeklyReport([rh("a", "2026-01-01"), rh("old", "2026-01-01", "2026-09-01")], indexOf(), "2026-10-12", today);
    expect(report.habits.map((h) => h.habitId)).toEqual(["a"]);
  });
});

describe("buildMonthlyReport (FR-15)", () => {
  const today = "2026-10-23";

  it("bulan tanpa habit-day eligible bernilai null, bukan 0%", () => {
    const report = buildMonthlyReport([rh("a", "2026-03-15")], indexOf(), 2026, 10, today);
    expect(report.months).toHaveLength(12);
    expect(report.months[0].rate).toBeNull(); // Januari: belum mulai
    expect(report.months[1].rate).toBeNull();
    expect(report.months[2]).toMatchObject({ eligible: 17, rate: 0 }); // Maret: 15–31
    expect(report.months[10].rate).toBeNull(); // November: masa depan
  });

  it("habit terbaik dan yang paling perlu perhatian", () => {
    const habits = [rh("a", "2026-10-01"), rh("b", "2026-10-01"), rh("c", "2026-10-01")];
    const index = indexOf(checkRange("a", "2026-10-01", "2026-10-10"), checkRange("b", "2026-10-01", "2026-10-05"), checks("c", ["2026-10-01"]));
    const report = buildMonthlyReport(habits, index, 2026, 10, today);
    expect(report.best?.habitId).toBe("a");
    expect(report.needsAttention?.habitId).toBe("c");
    expect(report.summary.activeDays).toBe(10);
  });

  it("satu habit atau rasio sama: tidak ada 'perlu perhatian'", () => {
    const one = buildMonthlyReport([rh("a", "2026-10-01")], indexOf(checks("a", ["2026-10-01"])), 2026, 10, today);
    expect(one.best?.habitId).toBe("a");
    expect(one.needsAttention).toBeNull();

    const equal = buildMonthlyReport([rh("a", "2026-10-01"), rh("b", "2026-10-01")], indexOf(), 2026, 10, today);
    expect(equal.needsAttention).toBeNull();
  });

  it("riwayat habit yang diarsipkan tetap dihitung untuk bulan sebelum tanggal arsip", () => {
    const archived = rh("old", "2026-01-01", "2026-06-11");
    const index = indexOf(checkRange("old", "2026-06-01", "2026-06-10"));
    const report = buildMonthlyReport([archived], index, 2026, 6, today);
    expect(report.summary).toMatchObject({ checked: 10, eligible: 10, rate: 1 });
    expect(report.months[6].rate).toBeNull(); // Juli: sudah diarsipkan
  });

  it("bulan tanpa data: tidak ada habit di tabel", () => {
    const report = buildMonthlyReport([rh("a", "2026-10-01")], indexOf(), 2026, 5, today);
    expect(report.habits).toEqual([]);
    expect(report.best).toBeNull();
  });
});

describe("buildYearlyReport (FR-16)", () => {
  it("TC-15: tahun kabisat memiliki 366 sel heatmap dan penyebut 366", () => {
    const habits = [rh("a", "2028-01-01")];
    const report = buildYearlyReport(habits, indexOf(checkRange("a", "2028-01-01", "2028-12-31")), 2028, "2029-01-01");
    expect(report.heatmap).toHaveLength(366);
    expect(report.summary).toMatchObject({ checked: 366, eligible: 366, rate: 1, perfectDays: 366 });
    expect(report.heatmap.every((d) => d.level === 4 && !d.future)).toBe(true);
  });

  it("tahun berjalan: sel setelah Hari Ini ditandai future dan level 0", () => {
    const report = buildYearlyReport([rh("a", "2026-01-01")], indexOf(), 2026, "2026-10-23");
    expect(report.heatmap).toHaveLength(365);
    expect(report.summary.eligible).toBe(296);
    const future = report.heatmap.filter((d) => d.future);
    expect(future).toHaveLength(365 - 296);
    expect(future.every((d) => d.level === 0 && d.eligible === 0)).toBe(true);
  });

  it("level heatmap mengikuti batas FR-16.3", () => {
    const habits = ["a", "b", "c", "d", "e"].map((id) => rh(id, "2026-01-01"));
    const index = buildCompletionIndex([
      ...["a", "b", "c", "d", "e"].map((habitId) => ({ habitId, date: "2026-02-05", completed: true })), // 100%
      ...["a", "b", "c", "d"].map((habitId) => ({ habitId, date: "2026-02-04", completed: true })), // 80%
      ...["a", "b"].map((habitId) => ({ habitId, date: "2026-02-03", completed: true })), // 40%
      ...["a"].map((habitId) => ({ habitId, date: "2026-02-02", completed: true })), // 20%
    ]);
    const level = (date: string) => buildYearlyReport(habits, index, 2026, "2026-10-23").heatmap.find((d) => d.date === date)?.level;
    expect([level("2026-02-01"), level("2026-02-02"), level("2026-02-03"), level("2026-02-04"), level("2026-02-05")]).toEqual([0, 1, 2, 3, 4]);
  });

  it("pola hari dalam seminggu berurutan Senin–Minggu", () => {
    // 2026-10-19 Senin, 2026-10-20 Selasa
    const report = buildYearlyReport([rh("a", "2026-10-19")], indexOf(checks("a", ["2026-10-19"])), 2026, "2026-10-21");
    expect(report.weekdays.map((w) => w.dayOfWeek)).toEqual([1, 2, 3, 4, 5, 6, 0]);
    expect(report.weekdays[0].average).toBe(1);
    expect(report.weekdays[1].average).toBe(0);
    expect(report.weekdays[2].average).toBe(0); // Rabu 21 = Hari Ini, eligible dan belum dicentang
    expect(report.weekdays[3].average).toBeNull(); // Kamis belum tiba
  });

  it("streak terpanjang dibatasi pada tahun yang dipilih", () => {
    const habits = [rh("a", "2025-01-01")];
    const index = indexOf(checkRange("a", "2025-12-28", "2026-01-03"));
    expect(buildYearlyReport(habits, index, 2026, "2026-10-23").habits[0].longestStreak).toBe(3);
    expect(buildYearlyReport(habits, index, 2025, "2026-10-23").habits[0].longestStreak).toBe(4);
  });

  it("mondayFirstRow: Senin = 0, Minggu = 6", () => {
    expect(mondayFirstRow("2026-10-19")).toBe(0);
    expect(mondayFirstRow("2026-10-25")).toBe(6);
  });
});
