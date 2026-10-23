import type { Theme } from "@/lib/constants";

export const THEME_STORAGE_KEY = "ht-theme";

/**
 * Sumber kebenaran tema adalah database (FR-20). localStorage hanya cache agar tema terpasang sebelum
 * halaman dicat; skrip di <head> membacanya, dan ThemeSync menyelaraskannya dengan database.
 */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") delete root.dataset.theme;
  else root.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // penyimpanan tidak tersedia (mode privat): tema tetap berlaku untuk sesi ini
  }
}
