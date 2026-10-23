import { HABIT_MILESTONE_DAYS } from "@/lib/constants";
import { dateRange, shiftDate, startOfWeek, type DateString } from "@/lib/dates";
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
/** Bonus XP untuk setiap tantangan mingguan yang selesai (FR-25). */
export const CHALLENGE_BONUS = 50;

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

export type AchievementGroup = "start" | "flame" | "perfect" | "active" | "formed" | "checks" | "level" | "challenge";

interface Stats {
  totalChecks: number;
  perfectDays: number;
  activeDays: number;
  longestFlame: number;
  formedHabits: number;
  level: number;
  completedChallenges: number;
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
  { id: "challenge-1", group: "challenge", title: "Tantangan Pertama", description: "Selesaikan satu tantangan mingguan.", target: 1, metric: (s) => s.completedChallenges },
  { id: "challenge-10", group: "challenge", title: "Penakluk Tantangan", description: "Selesaikan 10 tantangan mingguan.", target: 10, metric: (s) => s.completedChallenges },
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

// ------------------------------------------------------------------ Lencana per habit (FR-26)

export const HABIT_MEDALS = [
  { days: 7, name: "Perunggu" },
  { days: 21, name: "Perak" },
  { days: HABIT_MILESTONE_DAYS, name: "Emas" },
  { days: 100, name: "Berlian" },
] as const;

export interface HabitBadges {
  habitId: string;
  /** Total hari tercentang (sama dengan tonggak 66 hari, FR-13). */
  completedDays: number;
  earned: { name: string; days: number; date: DateString }[];
  next: { name: string; days: number } | null;
}

// ------------------------------------------------------------------ Tantangan mingguan (FR-25)

export type ChallengeKind = "active" | "perfect" | "focus";

export interface WeeklyChallenge {
  kind: ChallengeKind;
  target: number;
  /** Habit fokus (hanya untuk kind "focus"). */
  habitId?: string;
  progress: number;
  /** Progres tanpa hari ini, agar UI dapat menambahkan kontribusi hari ini secara optimistik. */
  progressBeforeToday: number;
  completedAt: DateString | null;
}

export interface WeekSummary {
  start: DateString;
  end: DateString;
  challenges: WeeklyChallenge[];
}

/** Batas jauh untuk menghitung hari eligible yang belum tiba saat menyusun target minggu ini. */
const PLAN_HORIZON = "9999-12-31";

/**
 * Susun tiga tantangan untuk minggu yang dimulai pada `weekStart` (dipotong ke `from` bila riwayat dimulai di
 * tengah minggu). Habit fokus = habit dengan tingkat penyelesaian terendah pada minggu sebelumnya.
 */
function planWeek(habits: readonly MetricHabit[], index: CompletionIndex, today: DateString, weekStart: DateString, from: DateString): WeekSummary {
  const end = shiftDate(weekStart, 6);
  const days = dateRange(from > weekStart ? from : weekStart, end);
  const plannedDays = (habit: MetricHabit) => days.filter((d) => isEligible(habit, d, PLAN_HORIZON)).length;

  const activeTarget = days.filter((d) => habits.some((h) => isEligible(h, d, PLAN_HORIZON))).length;
  const challenges: WeeklyChallenge[] = [];
  const blank = { progress: 0, progressBeforeToday: 0, completedAt: null };
  if (activeTarget > 0) {
    challenges.push({ kind: "active", target: activeTarget, ...blank });
    challenges.push({ kind: "perfect", target: Math.min(3, activeTarget), ...blank });
  }

  const candidates = habits.filter((h) => plannedDays(h) > 0);
  let focus: MetricHabit | undefined;
  let lowest = Infinity;
  for (const habit of candidates) {
    let checked = 0;
    let eligible = 0;
    for (const d of dateRange(shiftDate(weekStart, -7), shiftDate(weekStart, -1))) {
      if (!isEligible(habit, d, today)) continue;
      eligible++;
      if (isCompleted(index, habit.id, d)) checked++;
    }
    if (eligible > 0 && checked / eligible < lowest) {
      lowest = checked / eligible;
      focus = habit;
    }
  }
  focus ??= candidates[0];
  if (focus) challenges.push({ kind: "focus", habitId: focus.id, target: Math.min(5, plannedDays(focus)), ...blank });

  return { start: weekStart, end, challenges };
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
  /** Tantangan minggu berjalan; null bila belum ada habit. */
  week: WeekSummary | null;
  habitBadges: HabitBadges[];
}

export interface GamificationOptions {
  /** Hari awal minggu untuk tantangan mingguan: 0 = Minggu, 1 = Senin (Pengaturan). */
  weekStartsOn?: 0 | 1;
}

/**
 * Hitung seluruh gamifikasi dari riwayat. `habits` mencakup habit yang diarsipkan agar riwayat lama tetap
 * dihitung, sama seperti laporan (FR-03.1).
 */
export function computeGamification(
  habits: readonly MetricHabit[],
  index: CompletionIndex,
  today: DateString,
  { weekStartsOn = 1 }: GamificationOptions = {},
): GamificationSummary {
  const start = habits.reduce<DateString | null>((min, h) => (min === null || h.startDate < min ? h.startDate : min), null);
  const days = start === null || start > today ? [] : dateRange(start, today);

  let flameState = INITIAL_FLAME;
  let xpBeforeToday = 0;
  let todayChecked = 0;
  let todayEligible = 0;
  let todayBonus = 0;
  const stats: Stats = { totalChecks: 0, perfectDays: 0, activeDays: 0, longestFlame: 0, formedHabits: 0, level: 1, completedChallenges: 0 };
  const perHabit = new Map<string, number>();
  const medals = new Map<string, HabitBadges["earned"]>();
  const unlockedAt = new Map<string, DateString>();
  let week: WeekSummary | null = null;

  for (const date of days) {
    if (week === null || date > week.end) week = planWeek(habits, index, today, startOfWeek(date, weekStartsOn), date);

    let checked = 0;
    let eligible = 0;
    const focusId = week.challenges.find((c) => c.kind === "focus")?.habitId;
    let focusDone = false;
    for (const habit of habits) {
      if (!isEligible(habit, date, today)) continue;
      eligible++;
      if (!isCompleted(index, habit.id, date)) continue;
      checked++;
      if (habit.id === focusId) focusDone = true;
      const count = (perHabit.get(habit.id) ?? 0) + 1;
      perHabit.set(habit.id, count);
      if (count === HABIT_MILESTONE_DAYS) stats.formedHabits++;
      const medal = HABIT_MEDALS.find((m) => m.days === count);
      if (medal) medals.set(habit.id, [...(medals.get(habit.id) ?? []), { name: medal.name, days: medal.days, date }]);
    }

    // Tantangan mingguan: bonus diberikan pada hari tantangan selesai.
    let bonus = 0;
    const perfect = eligible > 0 && checked === eligible;
    for (const challenge of week.challenges) {
      const contributes = challenge.kind === "active" ? checked > 0 : challenge.kind === "perfect" ? perfect : focusDone;
      if (contributes) challenge.progress++;
      if (challenge.completedAt === null && challenge.progress >= challenge.target) {
        challenge.completedAt = date;
        stats.completedChallenges++;
        bonus += CHALLENGE_BONUS;
      }
    }
    if (date !== today) for (const challenge of week.challenges) challenge.progressBeforeToday = challenge.progress;

    const xp = dayXp(checked, eligible) + bonus;
    if (date === today) {
      todayChecked = checked;
      todayEligible = eligible;
      todayBonus = bonus;
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

  const xpToday = dayXp(todayChecked, todayEligible) + todayBonus;
  const total = xpBeforeToday + xpToday;

  return {
    flame: finishToday(flameState, todayChecked, todayEligible),
    todayVariants: {
      lit: finishToday(flameState, Math.max(1, todayChecked), Math.max(1, todayEligible)),
      unlit: finishToday(flameState, 0, todayEligible),
    },
    xp: { total, beforeToday: xpBeforeToday, today: xpToday },
    level: levelFromXp(total),
    stats: {
      totalChecks: stats.totalChecks,
      perfectDays: stats.perfectDays,
      activeDays: stats.activeDays,
      formedHabits: stats.formedHabits,
      completedChallenges: stats.completedChallenges,
    },
    achievements: ACHIEVEMENTS.map((def) => ({
      id: def.id,
      group: def.group,
      title: def.title,
      description: def.description,
      target: def.target,
      progress: Math.min(def.target, def.metric(stats)),
      unlockedAt: unlockedAt.get(def.id) ?? null,
    })),
    // Progres ditampilkan maksimal sebesar target (hari ke-4 dari "3 Hari Sempurna" tetap tertulis 3/3).
    week:
      week && week.end >= today
        ? {
            ...week,
            challenges: week.challenges.map((c) => ({
              ...c,
              progress: Math.min(c.target, c.progress),
              progressBeforeToday: Math.min(c.target, c.progressBeforeToday),
            })),
          }
        : null,
    habitBadges: habits.map((habit) => {
      const completedDays = perHabit.get(habit.id) ?? 0;
      return {
        habitId: habit.id,
        completedDays,
        earned: medals.get(habit.id) ?? [],
        next: HABIT_MEDALS.find((m) => m.days > completedDays) ?? null,
      };
    }),
  };
}

/** Judul tantangan dalam bahasa sehari-hari. */
export function challengeTitle(challenge: Pick<WeeklyChallenge, "kind" | "target">, focusName?: string): string {
  if (challenge.kind === "active") return `Nyalakan api ${challenge.target} hari`;
  if (challenge.kind === "perfect") return `${challenge.target} Hari Sempurna`;
  return `Fokus ${focusName ?? "habit"}: ${challenge.target} hari`;
}

export interface LiveChallenge extends WeeklyChallenge {
  done: boolean;
  /** Selesai berkat centang hari ini (bonusnya masuk XP hari ini). */
  completesToday: boolean;
}

/**
 * Progres tantangan dengan status hari ini dari UI (optimistic): `progressBeforeToday` + kontribusi hari ini.
 * Dipakai dashboard agar tantangan dan bonus XP berubah seketika saat mencentang.
 */
export function liveChallenges(
  challenges: readonly WeeklyChallenge[],
  today: { lit: boolean; perfect: boolean; checkedHabitIds: ReadonlySet<string> },
): LiveChallenge[] {
  return challenges.map((c) => {
    const contributes = c.kind === "active" ? today.lit : c.kind === "perfect" ? today.perfect : c.habitId !== undefined && today.checkedHabitIds.has(c.habitId);
    const progress = Math.min(c.target, c.progressBeforeToday + (contributes ? 1 : 0));
    const done = progress >= c.target;
    return { ...c, progress, done, completesToday: done && c.progressBeforeToday < c.target };
  });
}

export const challengeBonusToday = (live: readonly LiveChallenge[]) => live.filter((c) => c.completesToday).length * CHALLENGE_BONUS;
