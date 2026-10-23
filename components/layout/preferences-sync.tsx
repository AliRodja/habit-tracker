"use client";

import { useEffect } from "react";
import type { Theme } from "@/lib/constants";
import { applyGamification, applyTheme } from "@/lib/theme";

/** Menyelaraskan preferensi tampilan dari database ke <html> dan cache localStorage. */
export function PreferencesSync({ theme, gamification }: { theme: Theme; gamification: boolean }) {
  useEffect(() => applyTheme(theme), [theme]);
  useEffect(() => applyGamification(gamification), [gamification]);
  return null;
}
