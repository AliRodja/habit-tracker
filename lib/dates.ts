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
