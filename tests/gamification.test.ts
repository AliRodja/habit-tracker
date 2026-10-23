import { describe, expect, it } from "vitest";
import { dateRange, shiftDate } from "@/lib/dates";
import { computeGamification, dayXp, flameTier, levelFromXp, stepFlame, xpForLevel } from "@/lib/gamification";
import { checkRange, checks, habit, indexOf } from "./metrics/helpers";

const T = "2026-10-23";
const d = (offset: number) => shiftDate(T, offset);
const achievement = (summary: ReturnType<typeof computeGamification>, id: string) => summary.achievements.find((a) => a.id === id)!;

describe("flameTier", () => {
  it.each([
    [0, "Padam", "Percikan"],
    [1, "Percikan", "Nyala"],
    [2, "Percikan", "Nyala"],
    [3, "Nyala", "Kobaran"],
    [7, "Kobaran", "Membara"],
    [14, "Membara", "Api Unggun"],
    [30, "Api Unggun", "Api Abadi"],
    [66, "Api Abadi", null],
    [400, "Api Abadi", null],
  ])("%i hari → %s (berikutnya %s)", (streak, name, next) => {
    const tier = flameTier(streak);
    expect(tier.name).toBe(name);
    expect(tier.next?.name ?? null).toBe(next);
  });
});

describe("XP dan level", () => {
  it("10 XP per centang, +25 bila semua habit selesai", () => {
    expect(dayXp(3, 5)).toBe(30);
    expect(dayXp(5, 5)).toBe(75);
    expect(dayXp(1, 1)).toBe(35);
    expect(dayXp(0, 0)).toBe(0); // tanpa habit bukan Hari Sempurna
  });

  it("ambang level 0, 100, 300, 600, 1000", () => {
    expect([1, 2, 3, 4, 5].map(xpForLevel)).toEqual([0, 100, 300, 600, 1000]);
    expect(levelFromXp(0)).toEqual({ level: 1, current: 0, needed: 100 });
    expect(levelFromXp(99)).toEqual({ level: 1, current: 99, needed: 100 });
    expect(levelFromXp(100)).toEqual({ level: 2, current: 0, needed: 200 });
    expect(levelFromXp(450)).toEqual({ level: 3, current: 150, needed: 300 });
  });
});

describe("stepFlame", () => {
  const s = (streak: number, shields = 0) => ({ streak, longest: streak, shields, shieldsUsed: 0 });

  it("hari tanpa habit berjalan bersifat netral", () => {
    expect(stepFlame(s(4), 0, 0)).toEqual(s(4));
  });

  it("hari menyala menambah api; kelipatan 7 memberi pelindung, maksimal 2", () => {
    expect(stepFlame(s(6), 1, 3)).toMatchObject({ streak: 7, shields: 1 });
    expect(stepFlame(s(13, 1), 1, 1)).toMatchObject({ streak: 14, shields: 2 });
    expect(stepFlame(s(20, 2), 1, 1)).toMatchObject({ streak: 21, shields: 2 });
    expect(stepFlame(s(7, 0), 1, 1)).toMatchObject({ streak: 8, shields: 0 });
  });

  it("hari terlewat memakai pelindung (api bertahan) atau memadamkan api", () => {
    expect(stepFlame(s(9, 1), 0, 2)).toMatchObject({ streak: 9, shields: 0, shieldsUsed: 1, longest: 9 });
    expect(stepFlame(s(9, 0), 0, 2)).toMatchObject({ streak: 0, longest: 9 });
  });
});

describe("computeGamification", () => {
  it("hari ini yang belum diisi tidak memadamkan api; varian 'lit' menambah satu hari", () => {
    const g = computeGamification([habit("a", d(-4))], indexOf(checkRange("a", d(-4), d(-1))), T);
    expect(g.flame).toMatchObject({ streak: 4, litToday: false });
    expect(g.todayVariants.lit).toMatchObject({ streak: 5, litToday: true });
    expect(g.todayVariants.unlit).toMatchObject({ streak: 4, litToday: false });
  });

  it("hari terlewat tanpa pelindung memadamkan api, tetapi rekor tetap", () => {
    const g = computeGamification([habit("a", d(-5))], indexOf(checks("a", [d(-5), d(-4), d(-3), d(-1), d(0)])), T);
    expect(g.flame).toMatchObject({ streak: 2, longest: 3, litToday: true, shieldsUsed: 0 });
  });

  it("pelindung dari 7 hari beruntun menjaga api saat satu hari terlewat", () => {
    // 7 hari menyala → 1 pelindung; terlewat 1 hari; lalu 2 hari menyala (termasuk hari ini)
    const g = computeGamification([habit("a", d(-9))], indexOf(checkRange("a", d(-9), d(-3)), checks("a", [d(-1), d(0)])), T);
    expect(g.flame).toMatchObject({ streak: 9, shields: 0, shieldsUsed: 1 });
  });

  it("dua hari terlewat dengan satu pelindung tetap memadamkan api", () => {
    const g = computeGamification([habit("a", d(-10))], indexOf(checkRange("a", d(-10), d(-4)), checks("a", [d(0)])), T);
    expect(g.flame).toMatchObject({ streak: 1, shieldsUsed: 1, longest: 7 });
  });

  it("jeda tanpa habit yang berjalan tidak memadamkan api", () => {
    const habits = [habit("lama", d(-10), d(-7)), habit("baru", d(-3))]; // d(-7)..d(-4): tidak ada habit
    const g = computeGamification(habits, indexOf(checkRange("lama", d(-10), d(-8)), checkRange("baru", d(-3), d(0))), T);
    expect(g.flame).toMatchObject({ streak: 7, litToday: true });
  });

  it("XP dipisah antara sebelum hari ini dan hari ini", () => {
    const habits = [habit("a", d(-1)), habit("b", d(-1))];
    const g = computeGamification(habits, indexOf(checks("a", [d(-1), d(0)]), checks("b", [d(-1)])), T);
    expect(g.xp).toEqual({ beforeToday: 45, today: 10, total: 55 }); // kemarin sempurna (20+25), hari ini 1 centang
    expect(g.level).toEqual({ level: 1, current: 55, needed: 100 });
  });

  it("pencapaian terbuka pada tanggal syaratnya pertama kali terpenuhi, dengan progres untuk yang terkunci", () => {
    const g = computeGamification([habit("a", d(-9))], indexOf(checkRange("a", d(-9), d(-1))), T);
    expect(achievement(g, "first-check").unlockedAt).toBe(d(-9));
    expect(achievement(g, "first-perfect").unlockedAt).toBe(d(-9));
    expect(achievement(g, "flame-3").unlockedAt).toBe(d(-7));
    expect(achievement(g, "flame-7").unlockedAt).toBe(d(-3));
    expect(achievement(g, "flame-14")).toMatchObject({ unlockedAt: null, progress: 9, target: 14 });
    expect(achievement(g, "checks-100")).toMatchObject({ unlockedAt: null, progress: 9 });
  });

  it("kebiasaan terbentuk pada centang ke-66, dan level 5 pada 1000 XP", () => {
    const days = dateRange(d(-70), d(-5));
    expect(days).toHaveLength(66);
    const g = computeGamification([habit("a", d(-70))], indexOf(checks("a", days)), T);
    expect(achievement(g, "formed-1").unlockedAt).toBe(d(-5));
    expect(achievement(g, "flame-66").unlockedAt).toBe(d(-5));
    // 35 XP per hari sempurna → level 5 (1000 XP) pada hari ke-29
    expect(achievement(g, "level-5").unlockedAt).toBe(days[28]);
  });

  it("riwayat habit yang diarsipkan tetap dihitung", () => {
    const g = computeGamification([habit("a", d(-3), d(-1))], indexOf(checkRange("a", d(-3), d(-2))), T);
    expect(g.stats.totalChecks).toBe(2);
    expect(achievement(g, "first-check").unlockedAt).toBe(d(-3));
  });

  it("tanpa habit: semuanya nol dan terkunci", () => {
    const g = computeGamification([], indexOf(), T);
    expect(g.flame).toEqual({ streak: 0, longest: 0, shields: 0, shieldsUsed: 0, litToday: false });
    expect(g.xp.total).toBe(0);
    expect(g.achievements.every((a) => a.unlockedAt === null)).toBe(true);
  });
});
