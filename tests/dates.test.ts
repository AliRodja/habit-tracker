import { describe, expect, it } from "vitest";
import { dateRange, daysInYear, diffDays, isDateString, shiftDate, todayIn } from "@/lib/dates";

describe("dates", () => {
  it("todayIn memakai zona waktu pengguna, bukan UTC", () => {
    const instant = new Date("2026-10-23T18:30:00Z"); // 01:30 WIB tanggal 24
    expect(todayIn("Asia/Jakarta", instant)).toBe("2026-10-24");
    expect(todayIn("UTC", instant)).toBe("2026-10-23");
  });

  it("shiftDate melewati batas bulan dan tahun", () => {
    expect(shiftDate("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftDate("2028-03-01", -1)).toBe("2028-02-29");
  });

  it("dateRange inklusif dan diffDays konsisten", () => {
    expect(dateRange("2026-02-27", "2026-03-01")).toEqual(["2026-02-27", "2026-02-28", "2026-03-01"]);
    expect(diffDays("2026-01-01", "2026-01-08")).toBe(7);
  });

  it("daysInYear menangani tahun kabisat", () => {
    expect([2024, 2026, 2028, 2100, 2000].map(daysInYear)).toEqual([366, 365, 366, 365, 366]);
  });

  it("isDateString menolak tanggal tidak valid", () => {
    expect(isDateString("2026-02-29")).toBe(false);
    expect(isDateString("2026-2-3")).toBe(false);
    expect(isDateString("2028-02-29")).toBe(true);
  });
});
