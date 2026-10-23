import { describe, expect, it } from "vitest";
import { dateRange, shiftDate } from "@/lib/dates";
import { challengeBonusToday, computeGamification, dayXp, flameTier, levelFromXp, liveChallenges, stepFlame, xpForLevel, type WeeklyChallenge } from "@/lib/gamification";
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
    // 35 XP per hari sempurna + 50 XP per tantangan mingguan yang selesai → 1000 XP tercapai pada hari ke-17
    // (dihitung terpisah: 30 Agu 2026, 1.045 XP; tanpa bonus tantangan baru tercapai 11 Sep).
    expect(achievement(g, "level-5").unlockedAt).toBe(days[16]);
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

describe("tantangan mingguan (FR-25)", () => {
  // T = Jumat 23 Okt 2026; minggu Senin 19 – Minggu 25 Okt.
  const challenge = (g: ReturnType<typeof computeGamification>, kind: string) => g.week!.challenges.find((c) => c.kind === kind)!;

  it("menyusun tiga tantangan untuk minggu berjalan", () => {
    const g = computeGamification([habit("a", "2026-10-01")], indexOf(), T);
    expect(g.week).toMatchObject({ start: "2026-10-19", end: "2026-10-25" });
    expect(g.week!.challenges.map((c) => [c.kind, c.target])).toEqual([
      ["active", 7],
      ["perfect", 3],
      ["focus", 5],
    ]);
  });

  it("awal minggu mengikuti Pengaturan", () => {
    const g = computeGamification([habit("a", "2026-10-01")], indexOf(), T, { weekStartsOn: 0 });
    expect(g.week).toMatchObject({ start: "2026-10-18", end: "2026-10-24" });
  });

  it("habit fokus = habit paling tertinggal minggu lalu", () => {
    const habits = [habit("rajin", "2026-10-01"), habit("tertinggal", "2026-10-01")];
    const index = indexOf(checkRange("rajin", "2026-10-12", "2026-10-18"), checks("tertinggal", ["2026-10-12"]));
    expect(challenge(computeGamification(habits, index, T), "focus").habitId).toBe("tertinggal");
  });

  it("target dipotong pada minggu pertama riwayat dan menurut hari eligible habit fokus", () => {
    const g = computeGamification([habit("a", "2026-10-22")], indexOf(), T); // mulai Kamis
    expect(g.week!.challenges.map((c) => [c.kind, c.target])).toEqual([
      ["active", 4],
      ["perfect", 3],
      ["focus", 4],
    ]);
  });

  it("progres, tanggal selesai, dan bonus XP dihitung pada hari tantangan selesai", () => {
    // Senin–Kamis sempurna (1 habit) → "3 Hari Sempurna" selesai Rabu 21 Okt.
    const g = computeGamification([habit("a", "2026-10-01")], indexOf(checkRange("a", "2026-10-19", "2026-10-22")), T);
    expect(challenge(g, "perfect")).toMatchObject({ progress: 3, progressBeforeToday: 3, completedAt: "2026-10-21" });
    expect(challenge(g, "active")).toMatchObject({ progress: 4, completedAt: null });
    expect(g.stats.completedChallenges).toBeGreaterThanOrEqual(1);
    expect(achievement(g, "challenge-1").unlockedAt).not.toBeNull();
  });

  it("progressBeforeToday tidak menyertakan hari ini (untuk tampilan optimistik)", () => {
    const g = computeGamification([habit("a", "2026-10-19")], indexOf(checkRange("a", "2026-10-19", "2026-10-23")), T);
    expect(challenge(g, "active")).toMatchObject({ progress: 5, progressBeforeToday: 4 });
    // Fokus 5 hari selesai tepat hari ini: bonusnya masuk XP hari ini, bukan sebelum hari ini.
    expect(challenge(g, "focus").completedAt).toBe(T);
    expect(g.xp.today).toBe(35 + 50);
  });

  it("tanpa habit: tidak ada tantangan", () => {
    expect(computeGamification([], indexOf(), T).week).toBeNull();
  });
});

describe("lencana per habit (FR-26)", () => {
  it("Perunggu 7, Perak 21, Emas 66, Berlian 100 hari tercentang, dengan tanggal diraih", () => {
    const days = dateRange(d(-24), d(-1)); // 24 hari
    const g = computeGamification([habit("a", d(-24)), habit("b", d(-24))], indexOf(checks("a", days), checks("b", days.slice(0, 5))), T);
    const [a, b] = g.habitBadges;
    expect(a).toMatchObject({ habitId: "a", completedDays: 24, next: { name: "Emas", days: 66 } });
    expect(a.earned).toEqual([
      { name: "Perunggu", days: 7, date: days[6] },
      { name: "Perak", days: 21, date: days[20] },
    ]);
    expect(b).toMatchObject({ completedDays: 5, earned: [], next: { name: "Perunggu", days: 7 } });
  });
});

describe("liveChallenges (tampilan optimistik)", () => {
  const ch = (kind: WeeklyChallenge["kind"], target: number, before: number, habitId?: string): WeeklyChallenge => ({
    kind,
    target,
    habitId,
    progress: before,
    progressBeforeToday: before,
    completedAt: before >= target ? "2026-10-20" : null,
  });
  const challenges = [ch("active", 7, 6), ch("perfect", 3, 2), ch("focus", 5, 4, "f")];

  it("menambahkan kontribusi hari ini dan menandai tantangan yang selesai berkat hari ini", () => {
    const live = liveChallenges(challenges, { lit: true, perfect: false, checkedHabitIds: new Set(["f"]) });
    expect(live.map((c) => [c.kind, c.progress, c.done, c.completesToday])).toEqual([
      ["active", 7, true, true],
      ["perfect", 2, false, false],
      ["focus", 5, true, true],
    ]);
    expect(challengeBonusToday(live)).toBe(100);
  });

  it("tanpa centang hari ini progres tetap seperti sebelum hari ini", () => {
    const live = liveChallenges(challenges, { lit: false, perfect: false, checkedHabitIds: new Set() });
    expect(live.map((c) => c.progress)).toEqual([6, 2, 4]);
    expect(challengeBonusToday(live)).toBe(0);
  });

  it("tantangan yang sudah selesai sebelum hari ini tidak memberi bonus lagi dan tidak melewati target", () => {
    const live = liveChallenges([ch("perfect", 3, 3)], { lit: true, perfect: true, checkedHabitIds: new Set() });
    expect(live[0]).toMatchObject({ progress: 3, done: true, completesToday: false });
    expect(challengeBonusToday(live)).toBe(0);
  });
});
