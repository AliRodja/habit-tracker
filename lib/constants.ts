/**
 * Batas jumlah habit aktif (FR-01). Nilai yang berlaku diatur pengguna di Pengaturan (`maxActiveHabits`);
 * bawaannya 5 agar pengguna baru tetap fokus. Habit di arsip tidak dihitung.
 */
export const HABIT_LIMIT = { min: 1, max: 10, default: 5 } as const;

/** Baca batas dari nilai pengaturan (string); nilai tidak valid jatuh ke bawaan. */
export function parseHabitLimit(value: string | null | undefined): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= HABIT_LIMIT.min && n <= HABIT_LIMIT.max ? n : HABIT_LIMIT.default;
}

export const isHabitLimitValue = (value: string) => /^\d+$/.test(value) && Number(value) >= HABIT_LIMIT.min && Number(value) <= HABIT_LIMIT.max;
export const HABIT_MILESTONE_DAYS = 66;

export const HABIT_COLORS = ["emerald", "sky", "violet", "amber", "rose", "teal", "orange", "indigo"] as const;
export type HabitColor = (typeof HABIT_COLORS)[number];

export const THEMES = ["light", "dark", "system"] as const;
export const GAMIFICATION_MODES = ["on", "off"] as const;
export type Theme = (typeof THEMES)[number];

export const SETTING_DEFAULTS = {
  timezone: "Asia/Jakarta",
  weekStartsOn: "1",
  theme: "system",
  maxActiveHabits: String(HABIT_LIMIT.default),
  /** Api harian, XP, tantangan, dan pencapaian (FR-21–FR-27). */
  gamification: "on",
} as const;

/** Kata yang harus diketik untuk menghapus seluruh data (FR-20 zona bahaya). */
export const RESET_CONFIRM_TEXT = "HAPUS";
