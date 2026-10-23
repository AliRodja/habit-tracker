import type { DateString } from "@/lib/dates";

// Tanggal diformat sebagai UTC siang hari agar zona waktu perangkat tidak menggeser hari.
const at = (date: DateString) => new Date(`${date}T12:00:00Z`);
const fmt = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", ...options });

const weekdayShort = fmt({ weekday: "short" });
const dayLong = fmt({ weekday: "long", day: "numeric", month: "long", year: "numeric" });
const monthYear = fmt({ month: "long", year: "numeric" });
const monthOnly = fmt({ month: "long" });

export const formatWeekdayShort = (date: DateString) => weekdayShort.format(at(date));
export const formatDayLong = (date: DateString) => dayLong.format(at(date));
export const formatMonthYear = (year: number, month: number) => monthYear.format(at(`${year}-${String(month).padStart(2, "0")}-01`));
export const formatMonthName = (month: number) => monthOnly.format(at(`2026-${String(month).padStart(2, "0")}-01`));

export function formatPercent(ratio: number | null): string {
  return ratio === null ? "–" : `${Math.round(ratio * 100)}%`;
}

const dayMonth = fmt({ day: "numeric", month: "short" });
export const formatDayMonth = (date: DateString) => dayMonth.format(at(date));

/** Nama hari singkat dari nomor hari (0 = Minggu), mis. untuk sumbu grafik pola mingguan. */
export const weekdayShortOf = (dow: number) => weekdayShort.format(at(`2026-10-${18 + dow}`));

const dateShort = fmt({ day: "numeric", month: "short", year: "numeric" });
/** Tanggal ringkas untuk dibaca manusia, mis. "1 Jan 2026". */
export const formatDateShort = (date: DateString) => dateShort.format(at(date));
