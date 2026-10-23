import { TZDate } from "@date-fns/tz";
import { addDays, format, isValid, parseISO } from "date-fns";

/** Tanggal kalender "YYYY-MM-DD" tanpa jam, sehingga bebas dari pergeseran zona waktu. */
export type DateString = string;

export const DEFAULT_TIMEZONE = "Asia/Jakarta";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDateString(value: string): value is DateString {
  if (!DATE_RE.test(value)) return false;
  const parsed = parseISO(value);
  return isValid(parsed) && format(parsed, "yyyy-MM-dd") === value;
}

/** "Hari Ini" menurut zona waktu pengguna. */
export function todayIn(timeZone: string = DEFAULT_TIMEZONE, now: Date = new Date()): DateString {
  return format(new TZDate(now, timeZone), "yyyy-MM-dd");
}

export function shiftDate(date: DateString, days: number): DateString {
  return format(addDays(parseISO(date), days), "yyyy-MM-dd");
}

/** Selisih hari (b - a). */
export function diffDays(a: DateString, b: DateString): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86_400_000);
}

/** Seluruh tanggal dari `from` sampai `to` (inklusif). */
export function dateRange(from: DateString, to: DateString): DateString[] {
  const out: DateString[] = [];
  for (let d = from; d <= to; d = shiftDate(d, 1)) out.push(d);
  return out;
}

/** 0 = Minggu ... 6 = Sabtu. */
export function dayOfWeek(date: DateString): number {
  return parseISO(date).getDay();
}

export function daysInYear(year: number): number {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 366 : 365;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone });
    return true;
  } catch {
    return false;
  }
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Tanggal pertama dan terakhir sebuah bulan (month 1–12). */
export function monthBounds(year: number, month: number): { from: DateString; to: DateString } {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: `${year}-${pad2(month)}-01`, to: `${year}-${pad2(month)}-${pad2(lastDay)}` };
}

export function yearBounds(year: number): { from: DateString; to: DateString } {
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

/** "YYYY-MM" → { year, month }, atau null bila tidak valid. */
export function parseYearMonth(value: string | undefined): { year: number; month: number } | null {
  const match = value?.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  return month >= 1 && month <= 12 ? { year, month } : null;
}

export function formatYearMonth(year: number, month: number): string {
  return `${year}-${pad2(month)}`;
}

/** Geser bulan, mis. (2026, 12, +1) → 2027-01. */
export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/** Tanggal awal minggu yang memuat `date`. weekStartsOn: 0 = Minggu, 1 = Senin. */
export function startOfWeek(date: DateString, weekStartsOn: 0 | 1): DateString {
  return shiftDate(date, -((dayOfWeek(date) - weekStartsOn + 7) % 7));
}
