import { describe, expect, it } from "vitest";
import {
  buildCompletionIndex,
  completionRate,
  dayProgress,
  isEligible,
  lastEligibleDate,
  percentagePointChange,
} from "@/lib/metrics";
import { checks, habit, indexOf } from "./helpers";

describe("isEligible", () => {
  const h = habit("a", "2026-10-15", "2026-10-20");

  it("inklusif di startDate, eksklusif di archivedAt", () => {
    expect(isEligible(h, "2026-10-14", "2026-10-23")).toBe(false);
    expect(isEligible(h, "2026-10-15", "2026-10-23")).toBe(true);
    expect(isEligible(h, "2026-10-19", "2026-10-23")).toBe(true);
    expect(isEligible(h, "2026-10-20", "2026-10-23")).toBe(false);
  });

  it("tanggal masa depan tidak pernah eligible", () => {
    expect(isEligible(habit("a", "2026-01-01"), "2026-10-24", "2026-10-23")).toBe(false);
  });

  it("lastEligibleDate mengikuti Hari Ini atau hari sebelum arsip", () => {
    expect(lastEligibleDate(habit("a", "2026-01-01"), "2026-10-23")).toBe("2026-10-23");
    expect(lastEligibleDate(habit("a", "2026-01-01", "2026-10-20"), "2026-10-23")).toBe("2026-10-19");
    expect(lastEligibleDate(habit("a", "2026-11-01"), "2026-10-23")).toBeNull();
    expect(lastEligibleDate(habit("a", "2026-10-23", "2026-10-23"), "2026-10-23")).toBeNull();
  });
});

describe("dayProgress", () => {
  const today = "2026-10-23";
  const habits = ["a", "b", "c", "d", "e"].map((id) => habit(id, "2026-01-01"));

  it("TC-08: 3 dari 5 habit = 60%", () => {
    const index = indexOf(checks("a", [today]), checks("b", [today]), checks("c", [today]));
    expect(dayProgress(habits, index, today, today)).toEqual({ date: today, checked: 3, eligible: 5, ratio: 0.6 });
  });

  it("TC-09: habit yang mulai tgl 15 tidak masuk penyebut tgl 1–14", () => {
    const mixed = [habit("a", "2026-10-01"), habit("b", "2026-10-15")];
    const index = indexOf(checks("a", ["2026-10-10", "2026-10-16"]), checks("b", ["2026-10-16"]));
    expect(dayProgress(mixed, index, "2026-10-10", today)).toMatchObject({ checked: 1, eligible: 1, ratio: 1 });
    expect(dayProgress(mixed, index, "2026-10-16", today)).toMatchObject({ checked: 2, eligible: 2, ratio: 1 });
  });

  it("catatan sebelum startDate tidak dihitung", () => {
    const index = indexOf(checks("b", ["2026-10-10"]));
    const progress = dayProgress([habit("b", "2026-10-15")], index, "2026-10-10", today);
    expect(progress).toMatchObject({ checked: 0, eligible: 0, ratio: null });
  });

  it("penyebut nol menghasilkan null, bukan 0%", () => {
    expect(dayProgress([], buildCompletionIndex([]), today, today).ratio).toBeNull();
    expect(completionRate(0, 0)).toBeNull();
  });

  it("completed=false tidak dihitung sebagai centang", () => {
    const index = buildCompletionIndex([{ habitId: "a", date: today, completed: false }]);
    expect(dayProgress([habit("a", "2026-01-01")], index, today, today).checked).toBe(0);
  });
});

describe("percentagePointChange", () => {
  it("menghitung selisih poin persentase", () => {
    expect(percentagePointChange(0.6, 0.5)).toBe(10);
    expect(percentagePointChange(0.5, 0.6)).toBe(-10);
  });

  it("null bila salah satu periode kosong", () => {
    expect(percentagePointChange(null, 0.5)).toBeNull();
    expect(percentagePointChange(0.5, null)).toBeNull();
  });
});
