import Papa from "papaparse";
import { dateRange, isDateString, type DateString } from "@/lib/dates";
import { isEligible } from "@/lib/metrics";
import type { ExportFile, ImportIssue } from "./schema";

const BOM = "﻿";
const FORMULA_START = /^[=+\-@\t\r]/;
const ESCAPED_FORMULA = /^'[=+\-@\t\r]/;

/** Cegah injeksi rumus saat CSV dibuka di spreadsheet: sel yang diawali = + - @ diberi tanda petik. */
export const guardCell = (value: string) => (FORMULA_START.test(value) ? `'${value}` : value);
export const unguardCell = (value: string) => (ESCAPED_FORMULA.test(value) ? value.slice(1) : value);

const unparse = (fields: string[], data: string[][]) => BOM + Papa.unparse({ fields, data }, { newline: "\n" });

/** FR-18.2: satu baris per catatan. */
export function toCsvLong(file: ExportFile): string {
  const names = new Map(file.habits.map((habit) => [habit.id, habit.name]));
  return unparse(
    ["date", "habit_id", "habit_name", "completed", "note"],
    file.records.map((r) => [r.date, r.habitId, guardCell(names.get(r.habitId) ?? ""), r.completed ? "1" : "0", guardCell(r.note ?? "")]),
  );
}

/**
 * FR-18.3: gaya spreadsheet untuk satu tahun. Sel `1`/`0` hanya untuk habit yang eligible; di luar rentang
 * (sebelum mulai, setelah arsip, masa depan) dikosongkan agar tidak terbaca sebagai "belum dikerjakan".
 */
export function toCsvWide(file: ExportFile, year: number, today: DateString): string {
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;
  const habits = file.habits.filter((h) => h.startDate <= to && (h.archivedAt === null || h.archivedAt > from));

  // Nama kolom harus unik agar kolom tidak tertukar (mis. habit lama yang diarsipkan bernama sama).
  const seen = new Map<string, number>();
  const columns = habits.map((h) => {
    const count = (seen.get(h.name) ?? 0) + 1;
    seen.set(h.name, count);
    return guardCell(count === 1 ? h.name : `${h.name} (${count})`);
  });

  const done = new Set(file.records.filter((r) => r.completed).map((r) => `${r.habitId}|${r.date}`));
  const rows = dateRange(from, to).map((date) => {
    let checked = 0;
    let eligible = 0;
    const cells = habits.map((habit) => {
      if (!isEligible(habit, date, today)) return "";
      eligible++;
      const isDone = done.has(`${habit.id}|${date}`);
      if (isDone) checked++;
      return isDone ? "1" : "0";
    });
    return [date, ...cells, eligible === 0 ? "" : (checked / eligible).toFixed(2)];
  });
  return unparse(["date", ...columns, "progress"], rows);
}

export interface CsvRecordRow {
  /** Nomor baris pada berkas (baris 1 = header). */
  row: number;
  date: DateString;
  habitId: string;
  habitName: string;
  completed: boolean;
  note: string | null;
}

export type CsvParseResult = { rows: CsvRecordRow[]; issues: ImportIssue[] };

const TRUE_VALUES = new Set(["1", "true"]);
const FALSE_VALUES = new Set(["0", "false"]);

/** FR-19.1: CSV format panjang. Kolom wajib: date, completed, serta habit_id atau habit_name. */
export function parseCsvLong(text: string): CsvParseResult {
  const parsed = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim().toLowerCase(),
  });

  const fields = parsed.meta.fields ?? [];
  const missing = ["date", "completed"].filter((f) => !fields.includes(f));
  if (!fields.includes("habit_id") && !fields.includes("habit_name")) missing.push("habit_id atau habit_name");
  if (missing.length > 0) {
    return { rows: [], issues: [{ scope: "csv", row: 1, message: `kolom wajib tidak ditemukan: ${missing.join(", ")}` }] };
  }

  const rows: CsvRecordRow[] = [];
  const issues: ImportIssue[] = parsed.errors
    .filter((e) => e.type !== "FieldMismatch")
    .map((e) => ({ scope: "csv" as const, row: (e.row ?? 0) + 2, message: e.message }));

  parsed.data.forEach((raw, i) => {
    const row = i + 2;
    const problems: string[] = [];
    const date = (raw.date ?? "").trim();
    const completedRaw = (raw.completed ?? "").trim().toLowerCase();
    const note = unguardCell(raw.note ?? "").trim();
    const habitId = (raw.habit_id ?? "").trim();
    const habitName = unguardCell(raw.habit_name ?? "").trim();

    if (!isDateString(date)) problems.push("date tidak valid (gunakan YYYY-MM-DD)");
    if (!TRUE_VALUES.has(completedRaw) && !FALSE_VALUES.has(completedRaw)) problems.push("completed harus 1 atau 0");
    if (habitId === "" && habitName === "") problems.push("habit_id atau habit_name wajib diisi");
    if (note.length > 200) problems.push("note maksimal 200 karakter");

    if (problems.length > 0) {
      issues.push(...problems.map((message) => ({ scope: "csv" as const, row, message })));
      return;
    }
    rows.push({ row, date, habitId, habitName, completed: TRUE_VALUES.has(completedRaw), note: note === "" ? null : note });
  });

  return { rows, issues };
}
