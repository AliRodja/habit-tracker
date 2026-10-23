import { describe, expect, it } from "vitest";
import { currentStreak, longestStreak, milestoneProgress } from "@/lib/metrics";
import { checkRange, checks, habit, indexOf } from "./helpers";

const today = "2026-10-23";
const h = habit("a", "2026-01-01");

describe("currentStreak", () => {
  it("TC-11: hari ini belum diisi tidak memutus streak", () => {
    const index = indexOf(checkRange("a", "2026-10-18", "2026-10-22"));
    expect(currentStreak(h, index, today)).toBe(5);
  });

  it("hari ini sudah dicentang ikut dihitung", () => {
    const index = indexOf(checkRange("a", "2026-10-18", "2026-10-23"));
    expect(currentStreak(h, index, today)).toBe(6);
  });

  it("TC-12: melewatkan satu hari mereset streak saat ini, tetapi terpanjang tetap", () => {
    const index = indexOf(checkRange("a", "2026-10-01", "2026-10-10"), checkRange("a", "2026-10-13", "2026-10-14"));
    expect(currentStreak(h, index, today)).toBe(0);
    expect(longestStreak(h, index, today)).toBe(10);
  });

  it("kemarin terlewat dan hari ini belum diisi = 0", () => {
    const index = indexOf(checkRange("a", "2026-10-10", "2026-10-21"));
    expect(currentStreak(h, index, today)).toBe(0);
  });

  it("melintasi pergantian tahun", () => {
    const index = indexOf(checkRange("a", "2025-12-30", "2026-01-02"));
    expect(currentStreak(habit("a", "2025-01-01"), index, "2026-01-02")).toBe(4);
  });

  it("berhenti di startDate", () => {
    const index = indexOf(checkRange("a", "2026-10-10", "2026-10-23"));
    expect(currentStreak(habit("a", "2026-10-20"), index, today)).toBe(4);
  });

  it("habit yang belum mulai = 0", () => {
    expect(currentStreak(habit("a", "2026-11-01"), indexOf(), today)).toBe(0);
  });

  it("habit terarsip dihitung dari hari eligible terakhir tanpa kelonggaran hari ini", () => {
    const archived = habit("a", "2026-01-01", "2026-10-20");
    expect(currentStreak(archived, indexOf(checkRange("a", "2026-10-15", "2026-10-19")), today)).toBe(5);
    expect(currentStreak(archived, indexOf(checkRange("a", "2026-10-15", "2026-10-18")), today)).toBe(0);
  });
});

describe("longestStreak", () => {
  it("memilih rangkaian terpanjang", () => {
    const index = indexOf(checkRange("a", "2026-03-01", "2026-03-04"), checkRange("a", "2026-03-10", "2026-03-16"));
    expect(longestStreak(h, index, today)).toBe(7);
  });

  it("dengan range hanya menghitung hari di dalam range (mis. satu tahun)", () => {
    const index = indexOf(checkRange("a", "2025-12-28", "2026-01-03"));
    const longest2026 = longestStreak(habit("a", "2025-01-01"), index, "2026-10-23", {
      from: "2026-01-01",
      to: "2026-12-31",
    });
    expect(longest2026).toBe(3);
  });

  it("tanpa centang = 0", () => {
    expect(longestStreak(h, indexOf(), today)).toBe(0);
  });
});

describe("milestoneProgress", () => {
  it("TC-13: 66 centang memberi lencana Terbentuk", () => {
    const index = indexOf(checkRange("a", "2026-01-01", "2026-03-07")); // 66 hari
    expect(milestoneProgress(h, index, today)).toEqual({ completedDays: 66, target: 66, formed: true });
  });

  it("65 centang belum terbentuk", () => {
    const index = indexOf(checkRange("a", "2026-01-01", "2026-03-06"));
    expect(milestoneProgress(h, index, today)).toMatchObject({ completedDays: 65, formed: false });
  });

  it("menghitung total hari tercentang, bukan streak", () => {
    const index = indexOf(checks("a", ["2026-02-01", "2026-02-03", "2026-02-10"]));
    expect(milestoneProgress(h, index, today).completedDays).toBe(3);
  });

  it("mengabaikan catatan di luar rentang eligible", () => {
    const archived = habit("a", "2026-02-01", "2026-02-05");
    const index = indexOf(checks("a", ["2026-01-31", "2026-02-02", "2026-02-05", "2026-02-06"]));
    expect(milestoneProgress(archived, index, today).completedDays).toBe(1);
  });
});
