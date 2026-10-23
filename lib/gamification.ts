import { HABIT_MILESTONE_DAYS } from "@/lib/constants";
import { dateRange, type DateString } from "@/lib/dates";
import { isCompleted, isEligible, type CompletionIndex, type MetricHabit } from "@/lib/metrics";

/*
 * Gamifikasi (FR-21–FR-24). Seluruh nilai diturunkan dari riwayat centang, tanpa tabel tambahan, sehingga
 * backfill, impor, dan ekspor otomatis tetap konsisten. Modul ini murni dan aman dipakai di client.
 */

export const XP_PER_CHECK = 10;
export const PERFECT_DAY_BONUS = 25;
/** Setiap kelipatan hari beruntun ini memberi satu Pelindung Api. */
export const SHIELD_EVERY_DAYS = 7;
export const SHIELD_MAX = 2;

/** Tingkatan api menurut panjang hari beruntun. 66 hari = median pembentukan kebiasaan (Lally dkk., 2010). */
export const FLAME_TIERS = [
  { min: 0, name: "Padam" },
  { min: 1, name: "Percikan" },
  { min: 3, name: "Nyala" },
  { min: 7, name: "Kobaran" },
  { min: 14, name: "Membara" },
  { min: 30, name: "Api Unggun" },
  { min: HABIT_MILESTONE_DAYS, name: "Api Abadi" },
] as const;

export interface FlameTier {
  index: number;
  name: string;
  min: number;
  next: { name: string; min: number } | null;
}

export function flameTier(streak: number): FlameTier {
  let index = 0;
  FLAME_TIERS.forEach((tier, i) => {
    if (streak >= tier.min) index = i;
  });
  const next = FLAME_TIERS[index + 1] ?? null;
  return { index, name: FLAME_TIERS[index].name, min: FLAME_TIERS[index].min, next };
}

/** XP satu hari: 10 per centang, ditambah bonus bila semua habit yang berjalan selesai. */
export function dayXp(checked: number, eligible: number): number {
  return checked * XP_PER_CHECK + (eligible > 0 && checked === eligible ? PERFECT_DAY_BONUS : 0);
}

/** Total XP untuk mencapai level n: 50·n·(n−1), yaitu 0, 100, 300, 600, 1000, … */
export const xpForLevel = (level: number) => 50 * level * (level - 1);

export interface LevelInfo {
  level: number;
  /** XP yang sudah terkumpul di level ini. */
  current: number;
  /** XP yang dibutuhkan dari awal level ini ke level berikutnya. */
  needed: number;
}

export function levelFromXp(xp: number): LevelInfo {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return { level, current: xp - xpForLevel(level), needed: xpForLevel(level + 1) - xpForLevel(level) };
}

export interface FlameState {
  /** Hari beruntun saat ini (api menyala). */
  streak: number;
  longest: number;
  shields: number;
  /** Berapa kali pelindung pernah menjaga api. */
  shieldsUsed: number;
}

const INITIAL_FLAME: FlameState = { streak: 0, longest: 0, shields: 0, shieldsUsed: 0 };

/**
 * Satu hari yang sudah lewat. Hari tanpa habit yang berjalan bersifat netral. Hari terlewat memakai pelindung
 * bila ada (api tetap menyala, tetapi tidak bertambah); tanpa pelindung, api padam.
 */
export function stepFlame(state: FlameState, checked: number, eligible: number): FlameState {
  if (eligible === 0) return state;
  if (checked > 0) {
    const streak = state.streak + 1;
    const earned = streak % SHIELD_EVERY_DAYS === 0 && state.shields < SHIELD_MAX ? 1 : 0;
    return { ...state, streak, longest: Math.max(state.longest, streak), shields: state.shields + earned };
  }
  if (state.shields > 0) return { ...state, shields: state.shields - 1, shieldsUsed: state.shieldsUsed + 1 };
  return { ...state, streak: 0 };
}

export interface FlameSnapshot extends FlameState {
  /** Apakah hari ini sudah ada centang. Hari ini yang belum diisi tidak memadamkan api. */
  litToday: boolean;
}

/** Hari ini: bila sudah ada centang dihitung seperti biasa; bila belum, api dibiarkan menunggu. */
function finishToday(state: FlameState, checked: number, eligible: number): FlameSnapshot {
  if (checked > 0) return { ...stepFlame(state, checked, eligible), litToday: true };
  return { ...state, litToday: false };
}

// ------------------------------------------------------------------ Pencapaian

export type AchievementGroup = "start" | "flame" | "perfect" | "active" | "formed" | "checks" | "level";

interface Stats {
  totalChecks: number;
  perfectDays: number;
  activeDays: number;
  longestFlame: number;
  formedHabits: number;
  level: number;
}

interface AchievementDef {
  id: string;
  group: AchievementGroup;
  title: string;
  description: string;
  target: number;
  metric: (s: Stats) => number;
}

const flame = (id: string, title: string, target: number): AchievementDef => ({
  id,
  group: "flame",
  title,
  description: `Jaga api tetap menyala ${target} hari berturut-turut.`,
  target,
  metric: (s) => s.longestFlame,
});

const checks = (target: number): AchievementDef => ({
  id: `checks-${target}`,
  group: "checks",
  title: `${target.toLocaleString("id-ID")} Centang`,
  description: `Selesaikan kebiasaan sebanyak ${target.toLocaleString("id-ID")} kali.`,
  target,
  metric: (s) => s.totalChecks,
});

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  { id: "first-check", group: "start", title: "Langkah Pertama", description: "Centang kebiasaan untuk pertama kali.", target: 1, metric: (s) => s.totalChecks },
  { id: "first-perfect", group: "perfect", title: "Hari Sempurna Pertama", description: "Selesaikan semua kebiasaan dalam satu hari.", target: 1, metric: (s) => s.perfectDays },
  flame("flame-3", "Api Menyala", 3),
  flame("flame-7", "Seminggu Menyala", 7),
  flame("flame-14", "Dua Minggu Membara", 14),
  flame("flame-30", "Sebulan Penuh", 30),
  flame("flame-66", "Api Abadi", HABIT_MILESTONE_DAYS),
  flame("flame-100", "Seratus Hari", 100),
  { id: "perfect-7", group: "perfect", title: "7 Hari Sempurna", description: "Kumpulkan 7 Hari Sempurna.", target: 7, metric: (s) => s.perfectDays },
  { id: "perfect-30", group: "perfect", title: "30 Hari Sempurna", description: "Kumpulkan 30 Hari Sempurna.", target: 30, metric: (s) => s.perfectDays },
  { id: "active-100", group: "active", title: "100 Hari Aktif", description: "Centang minimal satu kebiasaan pada 100 hari berbeda.", target: 100, metric: (s) => s.activeDays },
  { id: "formed-1", group: "formed", title: "Kebiasaan Terbentuk", description: `Satu kebiasaan mencapai ${HABIT_MILESTONE_DAYS} hari tercentang.`, target: 1, metric: (s) => s.formedHabits },
  { id: "formed-3", group: "formed", title: "Tiga Kebiasaan Terbentuk", description: `Tiga kebiasaan masing-masing mencapai ${HABIT_MILESTONE_DAYS} hari tercentang.`, target: 3, metric: (s) => s.formedHabits },
  checks(100),
  checks(500),
  checks(1000),
  { id: "level-5", group: "level", title: "Level 5", description: "Kumpulkan XP hingga mencapai level 5.", target: 5, metric: (s) => s.level },
  { id: "level-10", group: "level", title: "Level 10", description: "Kumpulkan XP hingga mencapai level 10.", target: 10, metric: (s) => s.level },
];

export interface AchievementStatus {
  id: string;
  group: AchievementGroup;
  title: string;
  description: string;
  target: number;
  progress: number;
  /** Tanggal pertama kali syarat terpenuhi; null bila belum terbuka. */
  unlockedAt: DateString | null;
}

// ------------------------------------------------------------------ Ringkasan

export interface GamificationSummary {
  flame: FlameSnapshot;
  /** Keadaan api bila hari ini menyala / belum, agar UI dapat berubah seketika (optimistic) saat mencentang. */
  todayVariants: { lit: FlameSnapshot; unlit: FlameSnapshot };
  xp: { total: number; beforeToday: number; today: number };
  level: LevelInfo;
  stats: Omit<Stats, "level" | "longestFlame">;
  achievements: AchievementStatus[];
}

/**
 * Hitung seluruh gamifikasi dari riwayat. `habits` mencakup habit yang diarsipkan agar riwayat lama tetap
 * dihitung, sama seperti laporan (FR-03.1).
 */
export function computeGamification(habits: readonly MetricHabit[], index: CompletionIndex, today: DateString): GamificationSummary {
  const start = habits.reduce<DateString | null>((min, h) => (min === null || h.startDate < min ? h.startDate : min), null);
  const days = start === null || start > today ? [] : dateRange(start, today);

  let flameState = INITIAL_FLAME;
  let xpBeforeToday = 0;
  let todayChecked = 0;
  let todayEligible = 0;
  const stats: Stats = { totalChecks: 0, perfectDays: 0, activeDays: 0, longestFlame: 0, formedHabits: 0, level: 1 };
  const perHabit = new Map<string, number>();
  const unlockedAt = new Map<string, DateString>();

  for (const date of days) {
    let checked = 0;
    let eligible = 0;
    for (const habit of habits) {
      if (!isEligible(habit, date, today)) continue;
      eligible++;
      if (!isCompleted(index, habit.id, date)) continue;
      checked++;
      const count = (perHabit.get(habit.id) ?? 0) + 1;
      perHabit.set(habit.id, count);
      if (count === HABIT_MILESTONE_DAYS) stats.formedHabits++;
    }

    const xp = dayXp(checked, eligible);
    if (date === today) {
      todayChecked = checked;
      todayEligible = eligible;
      stats.longestFlame = Math.max(stats.longestFlame, finishToday(flameState, checked, eligible).longest);
    } else {
      flameState = stepFlame(flameState, checked, eligible);
      xpBeforeToday += xp;
      stats.longestFlame = flameState.longest;
    }

    stats.totalChecks += checked;
    if (checked > 0) stats.activeDays++;
    if (eligible > 0 && checked === eligible) stats.perfectDays++;
    stats.level = levelFromXp(xpBeforeToday + (date === today ? xp : 0)).level;

    for (const def of ACHIEVEMENTS) {
      if (!unlockedAt.has(def.id) && def.metric(stats) >= def.target) unlockedAt.set(def.id, date);
    }
  }

  const xpToday = dayXp(todayChecked, todayEligible);
  const total = xpBeforeToday + xpToday;

  return {
    flame: finishToday(flameState, todayChecked, todayEligible),
    todayVariants: {
      lit: finishToday(flameState, Math.max(1, todayChecked), Math.max(1, todayEligible)),
      unlit: finishToday(flameState, 0, todayEligible),
    },
    xp: { total, beforeToday: xpBeforeToday, today: xpToday },
    level: levelFromXp(total),
    stats: { totalChecks: stats.totalChecks, perfectDays: stats.perfectDays, activeDays: stats.activeDays, formedHabits: stats.formedHabits },
    achievements: ACHIEVEMENTS.map((def) => ({
      id: def.id,
      group: def.group,
      title: def.title,
      description: def.description,
      target: def.target,
      progress: Math.min(def.target, def.metric(stats)),
      unlockedAt: unlockedAt.get(def.id) ?? null,
    })),
  };
}
