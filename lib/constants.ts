export const MAX_ACTIVE_HABITS = 5;
export const HABIT_MILESTONE_DAYS = 66;

export const HABIT_COLORS = ["emerald", "sky", "violet", "amber", "rose", "teal", "orange", "indigo"] as const;
export type HabitColor = (typeof HABIT_COLORS)[number];

export const THEMES = ["light", "dark", "system"] as const;
export type Theme = (typeof THEMES)[number];

export const SETTING_DEFAULTS = {
  timezone: "Asia/Jakarta",
  weekStartsOn: "1",
  theme: "system",
} as const;
