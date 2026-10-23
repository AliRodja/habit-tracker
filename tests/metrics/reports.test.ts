import { describe, expect, it } from "vitest";
import {
  dayProgress,
  habitPeriodStats,
  heatmapLevel,
  mostProductiveDay,
  summarizePeriod,
  weekdayPattern,
} from "@/lib/metrics";
import { checkRange, checks, habit, indexOf } from "./helpers";

describe("summarizePeriod", () => {
  it("TC-15: tahun kabisat memakai penyebut 366 hari", () => {
    const h = habit("a", "2028-01-01");
    const index = indexOf(checkRange("a", "2028-01-01", "2028-12-31"));
    const summary = summarizePeriod([h], index, "2028-01-01", "2028-12-31", "2029-03-01");
    expect(summary).toMatchObject({ checked: 366, eligible: 366, rate: 1, perfectDays: 366, activeDays: 366 });
  });

  it("tahun biasa memakai penyebut 365 hari", () => {
    const summary = summarizePeriod([habit("a", "2026-01-01")], indexOf(), "2026-01-01", "2026-12-31", "2027-01-01");
    expect(summary.eligible).toBe(365);
  });

  it("tahun berjalan dihitung sampai Hari Ini saja", () => {
    const summary = summarizePeriod([habit("a", "2026-01-01")], indexOf(), "2026-01-01", "2026-12-31", "2026-10-23");
    expect(summary.eligible).toBe(296);
    expect(summary.days.at(-1)?.date).toBe("2026-10-23");
  });

  it("habit diarsipkan di tengah periode hanya dihitung sebelum tanggal arsip", () => {
    const archived = habit("a", "2026-10-01", "2026-10-11");
    const index = indexOf(checkRange("a", "2026-10-01", "2026-10-10"));
    const summary = summarizePeriod([archived], index, "2026-10-01", "2026-10-31", "2026-10-23");
    expect(summary).toMatchObject({ checked: 10, eligible: 10, rate: 1 });
  });

  it("periode tanpa habit-day eligible menghasilkan rate null, bukan 0%", () => {
    const summary = summarizePeriod([habit("a", "2026-11-01")], indexOf(), "2026-10-01", "2026-10-31", "2026-10-23");
    expect(summary).toMatchObject({ eligible: 0, rate: null, perfectDays: 0, activeDays: 0 });
  });

  it("periode seluruhnya di masa depan kosong", () => {
    const summary = summarizePeriod([habit("a", "2026-01-01")], indexOf(), "2026-11-01", "2026-11-30", "2026-10-23");
    expect(summary).toMatchObject({ days: [], rate: null });
  });

  it("melintasi pergantian tahun", () => {
    const h = habit("a", "2025-01-01");
    const index = indexOf(checks("a", ["2025-12-31"]));
    const summary = summarizePeriod([h], index, "2025-12-30", "2026-01-02", "2026-10-23");
    expect(summary).toMatchObject({ checked: 1, eligible: 4, activeDays: 1, perfectDays: 1 });
  });

  it("membedakan hari aktif dan hari sempurna", () => {
    const habits = [habit("a", "2026-10-01"), habit("b", "2026-10-01")];
    const index = indexOf(checks("a", ["2026-10-01", "2026-10-02"]), checks("b", ["2026-10-01"]));
    const summary = summarizePeriod(habits, index, "2026-10-01", "2026-10-03", "2026-10-23");
    expect(summary).toMatchObject({ checked: 3, eligible: 6, rate: 0.5, perfectDays: 1, activeDays: 2 });
  });
});

describe("mostProductiveDay", () => {
  const today = "2026-10-23";

  it("TC-14: memilih tanggal dengan progres harian tertinggi", () => {
    const habits = [habit("a", "2026-10-01"), habit("b", "2026-10-01")];
    const index = indexOf(checks("a", ["2026-10-11", "2026-10-12"]), checks("b", ["2026-10-12"]));
    const days = [dayProgress(habits, index, "2026-10-11", today), dayProgress(habits, index, "2026-10-12", today)];
    expect(mostProductiveDay(days)).toMatchObject({ date: "2026-10-12", checked: 2, eligible: 2 });
  });

  it("rasio sama, centang berbeda → centang terbanyak menang", () => {
    const days = [
      { date: "2026-10-01", checked: 1, eligible: 2, ratio: 0.5 },
      { date: "2026-10-02", checked: 2, eligible: 4, ratio: 0.5 },
    ];
    expect(mostProductiveDay(days)?.date).toBe("2026-10-02");
  });

  it("rasio dan centang sama → tanggal paling awal", () => {
    const days = [
      { date: "2026-10-05", checked: 2, eligible: 4, ratio: 0.5 },
      { date: "2026-10-03", checked: 2, eligible: 4, ratio: 0.5 },
    ];
    expect(mostProductiveDay(days)?.date).toBe("2026-10-03");
  });

  it("mengabaikan hari tanpa habit eligible; null bila tidak ada", () => {
    expect(mostProductiveDay([{ date: "2026-10-01", checked: 0, eligible: 0, ratio: null }])).toBeNull();
    expect(mostProductiveDay([])).toBeNull();
  });
});

describe("heatmapLevel", () => {
  it.each([
    [0, 0, 0],
    [0, 5, 0],
    [1, 5, 1],
    [39, 100, 1],
    [2, 5, 2], // tepat 40%
    [69, 100, 2],
    [7, 10, 3], // tepat 70%
    [4, 5, 3],
    [99, 100, 3],
    [5, 5, 4],
    [1, 1, 4],
  ])("checked=%i eligible=%i → level %i", (checked, eligible, level) => {
    expect(heatmapLevel(checked, eligible)).toBe(level);
  });
});

describe("weekdayPattern", () => {
  it("berurutan Senin–Minggu dan merata-ratakan progres harian", () => {
    // 2026-10-19 = Senin, 2026-10-20 = Selasa
    const days = [
      { date: "2026-10-19", checked: 1, eligible: 1, ratio: 1 },
      { date: "2026-10-26", checked: 0, eligible: 2, ratio: 0 },
      { date: "2026-10-20", checked: 1, eligible: 2, ratio: 0.5 },
      { date: "2026-10-21", checked: 0, eligible: 0, ratio: null },
    ];
    const pattern = weekdayPattern(days);
    expect(pattern.map((p) => p.dayOfWeek)).toEqual([1, 2, 3, 4, 5, 6, 0]);
    expect(pattern[0]).toMatchObject({ average: 0.5, sampleDays: 2 });
    expect(pattern[1]).toMatchObject({ average: 0.5, sampleDays: 1 });
    expect(pattern[2]).toMatchObject({ average: null, sampleDays: 0 });
  });
});

describe("habitPeriodStats", () => {
  it("menghitung centang/eligible dan streak terpanjang dalam periode", () => {
    const h = habit("a", "2026-10-01");
    const index = indexOf(checks("a", ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-05", "2026-10-07"]));
    expect(habitPeriodStats(h, index, "2026-10-01", "2026-10-07", "2026-10-23")).toEqual({
      habitId: "a",
      checked: 5,
      eligible: 7,
      rate: 5 / 7,
      longestStreak: 3,
    });
  });

  it("periode sebelum startDate: eligible 0 dan rate null", () => {
    const stats = habitPeriodStats(habit("a", "2026-10-15"), indexOf(), "2026-10-01", "2026-10-10", "2026-10-23");
    expect(stats).toMatchObject({ eligible: 0, rate: null, longestStreak: 0 });
  });
});
