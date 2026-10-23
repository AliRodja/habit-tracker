import type { DateString } from "@/lib/dates";

type ParamValue = string | string[] | undefined;

/** Nilai pertama dari parameter URL (Next.js memberi array bila kunci berulang). */
export const firstParam = (value: ParamValue) => (Array.isArray(value) ? value[0] : value);

/**
 * Daftar tahun yang dapat dipilih: dari tahun habit tertua hingga tahun berjalan.
 * `clamp` menjaga tahun dari URL tetap di rentang itu.
 */
export function yearRange(earliestStartDate: DateString | null, today: DateString) {
  const current = Number(today.slice(0, 4));
  const min = Math.min(current, earliestStartDate ? Number(earliestStartDate.slice(0, 4)) : current);
  const years = Array.from({ length: current - min + 1 }, (_, i) => min + i);
  const clamp = (year: number) => (Number.isInteger(year) ? Math.min(current, Math.max(min, year)) : current);
  return { years, current, min, clamp };
}
