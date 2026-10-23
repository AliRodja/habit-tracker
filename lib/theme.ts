import type { Theme } from "@/lib/constants";

export const THEME_STORAGE_KEY = "ht-theme";
export const GAMIFICATION_STORAGE_KEY = "ht-gamification";

/**
 * Sumber kebenaran preferensi tampilan adalah database (FR-20). localStorage hanya cache agar tema dan saklar
 * gamifikasi terpasang sebelum halaman dicat; skrip di <head> membacanya, dan PreferencesSync menyelaraskannya.
 */
export const PREFERENCES_INIT_SCRIPT = `try{var r=document.documentElement,t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark")r.dataset.theme=t;if(localStorage.getItem("${GAMIFICATION_STORAGE_KEY}")==="off")r.dataset.gamification="off"}catch(e){}`;

function remember(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // penyimpanan tidak tersedia (mode privat): preferensi tetap berlaku untuk sesi ini
  }
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") delete root.dataset.theme;
  else root.dataset.theme = theme;
  remember(THEME_STORAGE_KEY, theme);
}

/** Saat nonaktif, elemen bertanda `in-data-[gamification=off]:hidden` (mis. menu Pencapaian) disembunyikan. */
export function applyGamification(enabled: boolean) {
  const root = document.documentElement;
  if (enabled) delete root.dataset.gamification;
  else root.dataset.gamification = "off";
  remember(GAMIFICATION_STORAGE_KEY, enabled ? "on" : "off");
}
