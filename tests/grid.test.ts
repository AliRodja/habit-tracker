import { describe, expect, it } from "vitest";
import { addMonths, formatYearMonth, monthBounds, parseYearMonth, yearBounds } from "@/lib/dates";
import { buildGridRows, rowProgress } from "@/lib/grid";
import { habit } from "./metrics/helpers";

const today = "2026-10-23";

describe("buildGridRows", () => {
  const habits = [habit("a", "2026-10-01"), habit("b", "2026-10-15")];
  const rows = buildGridRows(
    habits,
    [
      { habitId: "a", date: "2026-10-22", completed: true, note: "lari pagi" },
      { habitId: "b", date: "2026-10-16", completed: false, note: "sakit" },
    ],
    "2026-10-01",
    "2026-10-31",
    today,
  );

  it("membuat satu baris per tanggal dalam bulan", () => {
    expect(rows).toHaveLength(31);
    expect(rows[0].date).toBe("2026-10-01");
    expect(rows.at(-1)?.date).toBe("2026-10-31");
  });

  it("menandai baris Hari Ini", () => {
    expect(rows.filter((r) => r.isToday).map((r) => r.date)).toEqual([today]);
  });

  it("FR-07.3: sel masa depan dan sebelum tanggal mulai tidak eligible", () => {
    expect(rows[13].cells.map((c) => c.eligible)).toEqual([true, false]); // tgl 14, b mulai tgl 15
    expect(rows[14].cells.map((c) => c.eligible)).toEqual([true, true]); // tgl 15
    expect(rows[23].cells.map((c) => c.eligible)).toEqual([false, false]); // tgl 24 = besok
  });

  it("membawa status centang dan catatan", () => {
    expect(rows[21].cells[0]).toEqual({ eligible: true, completed: true, note: "lari pagi" });
    expect(rows[15].cells[1]).toEqual({ eligible: true, completed: false, note: "sakit" });
    expect(rows[10].cells[0]).toEqual({ eligible: true, completed: false, note: null });
  });
});

describe("rowProgress", () => {
  it("FR-08: hanya menghitung sel eligible; null bila tidak ada", () => {
    const [row] = buildGridRows([habit("a", "2026-10-01"), habit("b", "2026-10-15")], [{ habitId: "a", date: "2026-10-10", completed: true, note: null }], "2026-10-10", "2026-10-10", today);
    expect(rowProgress(row)).toEqual({ checked: 1, eligible: 1, ratio: 1 });

    const [future] = buildGridRows([habit("a", "2026-10-01")], [], "2026-11-01", "2026-11-01", today);
    expect(rowProgress(future)).toEqual({ checked: 0, eligible: 0, ratio: null });
  });
});

describe("util bulan", () => {
  it("monthBounds menangani Februari kabisat dan biasa", () => {
    expect(monthBounds(2028, 2)).toEqual({ from: "2028-02-01", to: "2028-02-29" });
    expect(monthBounds(2026, 2)).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(monthBounds(2026, 12).to).toBe("2026-12-31");
    expect(yearBounds(2026)).toEqual({ from: "2026-01-01", to: "2026-12-31" });
  });

  it("addMonths melewati pergantian tahun", () => {
    expect(addMonths(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(addMonths(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    expect(addMonths(2026, 10, 0)).toEqual({ year: 2026, month: 10 });
  });

  it("parseYearMonth menolak format tidak valid", () => {
    expect(parseYearMonth("2026-10")).toEqual({ year: 2026, month: 10 });
    expect(parseYearMonth("2026-13")).toBeNull();
    expect(parseYearMonth("2026-1")).toBeNull();
    expect(parseYearMonth(undefined)).toBeNull();
    expect(formatYearMonth(2026, 3)).toBe("2026-03");
  });
});
