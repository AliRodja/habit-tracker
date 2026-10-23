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
