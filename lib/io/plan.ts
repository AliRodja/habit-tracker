import { HABIT_LIMIT, parseHabitLimit } from "@/lib/constants";
import type { DateString } from "@/lib/dates";
import { parseCsvLong, type CsvRecordRow } from "./csv";
import {
  exportFileSchema,
  issuesFromZod,
  type ExportFile,
  type ExportHabit,
  type ExportRecord,
  type ExportSettings,
  type ImportIssue,
} from "./schema";

export type ImportMode = "merge" | "replace";
export type ImportFormat = "json" | "csv";

export type ParsedImport =
  | { format: ImportFormat; source: { kind: "json"; file: ExportFile } | { kind: "csv"; rows: CsvRecordRow[] }; issues: ImportIssue[] }
  | { format: ImportFormat; source: null; issues: ImportIssue[] };

/** Format ditentukan dari ekstensi nama berkas; bila tidak jelas, dari karakter pertama isi. */
export function detectFormat(text: string, filename: string): ImportFormat {
  const name = filename.toLowerCase();
  if (name.endsWith(".json")) return "json";
  if (name.endsWith(".csv")) return "csv";
  return /^\s*[{[]/.test(text.replace(/^﻿/, "")) ? "json" : "csv";
}

/** Langkah 1 impor: urai dan validasi skema. Belum membandingkan dengan data lokal. */
export function parseImportText(text: string, filename: string): ParsedImport {
  const format = detectFormat(text, filename);

  if (format === "csv") {
    const { rows, issues } = parseCsvLong(text);
    return { format, source: { kind: "csv", rows }, issues };
  }

  let json: unknown;
  try {
    json = JSON.parse(text.replace(/^﻿/, ""));
  } catch {
    return { format, source: null, issues: [{ scope: "file", row: null, message: "Berkas bukan JSON yang valid." }] };
  }
  const result = exportFileSchema.safeParse(json);
  if (!result.success) return { format, source: null, issues: issuesFromZod(result.error) };
  return { format, source: { kind: "json", file: result.data }, issues: [] };
}

export interface ExistingState {
  habits: { id: string; name: string; isActive: boolean }[];
  /** Kunci `habitId|date` seluruh catatan lokal. */
  recordKeys: ReadonlySet<string>;
  /** Batas habit aktif yang berlaku saat ini. */
  maxActive: number;
}

export interface ImportCounts {
  habits: { total: number; created: number; updated: number };
  records: { total: number; created: number; updated: number };
  /** Jumlah habit aktif setelah impor diterapkan. */
  activeAfter: number;
}

export interface ImportPlan {
  format: ImportFormat;
  mode: ImportMode;
  counts: ImportCounts;
  habits: ExportHabit[];
  records: ExportRecord[];
  /** Hanya diterapkan pada mode Ganti (mengembalikan keadaan cadangan). */
  settings: ExportSettings | null;
  issues: ImportIssue[];
  canApply: boolean;
}

const nameKey = (name: string) => name.trim().toLowerCase();
const recordKey = (habitId: string, date: DateString) => `${habitId}|${date}`;

/**
 * Langkah 2: bandingkan dengan data lokal dan hitung rencana. Semua-atau-tidak-sama-sekali:
 * satu galat saja membuat `canApply` false, sehingga tidak ada data yang berubah (FR-19.5).
 */
export function buildImportPlan(
  parsed: ParsedImport,
  existing: ExistingState,
  mode: ImportMode,
  today: DateString,
): ImportPlan {
  const issues: ImportIssue[] = [...parsed.issues];
  const plan: ImportPlan = {
    format: parsed.format,
    mode,
    counts: {
      habits: { total: 0, created: 0, updated: 0 },
      records: { total: 0, created: 0, updated: 0 },
      activeAfter: existing.habits.filter((h) => h.isActive).length,
    },
    habits: [],
    records: [],
    settings: null,
    issues,
    canApply: false,
  };

  if (parsed.source?.kind === "json") planJson(plan, parsed.source.file, existing, today);
  else if (parsed.source?.kind === "csv") planCsv(plan, parsed.source.rows, existing, today);

  plan.canApply = plan.issues.length === 0 && plan.counts.records.total + plan.counts.habits.total > 0;
  if (parsed.source && plan.counts.records.total + plan.counts.habits.total === 0 && plan.issues.length === 0) {
    plan.issues.push({ scope: "file", row: null, message: "Berkas tidak berisi habit maupun catatan." });
  }
  return plan;
}

function planJson(plan: ImportPlan, file: ExportFile, existing: ExistingState, today: DateString) {
  const { issues, mode } = plan;
  const existingIds = new Set(existing.habits.map((h) => h.id));

  // Habit: id unik, lalu keadaan akhir (gabungan lokal + berkas, atau hanya berkas pada mode Ganti).
  const seenIds = new Set<string>();
  file.habits.forEach((habit, i) => {
    if (seenIds.has(habit.id)) issues.push({ scope: "habit", row: i + 1, message: `id "${habit.id}" muncul lebih dari sekali` });
    seenIds.add(habit.id);
  });

  const finalHabits = new Map<string, { name: string; isActive: boolean }>();
  if (mode === "merge") for (const h of existing.habits) finalHabits.set(h.id, h);
  for (const h of file.habits) finalHabits.set(h.id, h);

  const activeByName = new Map<string, string>();
  for (const [id, h] of finalHabits) {
    if (!h.isActive) continue;
    const owner = activeByName.get(nameKey(h.name));
    if (owner !== undefined && owner !== id) {
      const row = file.habits.findIndex((fh) => fh.id === id || fh.id === owner) + 1;
      issues.push({ scope: "habit", row: row || null, message: `nama "${h.name}" sudah dipakai habit aktif lain` });
    }
    activeByName.set(nameKey(h.name), id);
  }

  // Mode Ganti dengan pengaturan di berkas ikut mengganti batasnya (kunci yang tidak ada kembali ke bawaan).
  const fileHasSettings = mode === "replace" && file.settings !== undefined && Object.keys(file.settings).length > 0;
  const limit = fileHasSettings ? parseHabitLimit(file.settings?.maxActiveHabits ?? String(HABIT_LIMIT.default)) : existing.maxActive;

  const activeAfter = [...finalHabits.values()].filter((h) => h.isActive).length;
  if (activeAfter > limit) {
    issues.push({
      scope: "file",
      row: null,
      message:
        mode === "merge"
          ? `Hasil impor akan memiliki ${activeAfter} habit aktif (batas saat ini ${limit}). Naikkan batasnya di Pengaturan, arsipkan atau hapus habit lokal terlebih dahulu, tandai sebagian habit di berkas sebagai nonaktif, atau gunakan mode Ganti.`
          : `Berkas memuat ${activeAfter} habit aktif (batas ${limit}). Tandai sebagian habit di berkas sebagai nonaktif (isActive: false dan isi archivedAt)${fileHasSettings ? ", atau naikkan maxActiveHabits pada pengaturan di berkas" : ", atau naikkan batasnya di Pengaturan"}.`,
    });
  }

  // Catatan: habit harus dikenal, pasangan unik, dan tidak di masa depan.
  const seenRecords = new Map<string, number>();
  file.records.forEach((record, i) => {
    const row = i + 1;
    if (!finalHabits.has(record.habitId)) {
      issues.push({ scope: "record", row, message: `habitId "${record.habitId}" tidak dikenal` });
    }
    if (record.date > today) issues.push({ scope: "record", row, message: `tanggal ${record.date} berada di masa depan` });
    const key = recordKey(record.habitId, record.date);
    const first = seenRecords.get(key);
    if (first !== undefined) issues.push({ scope: "record", row, message: `duplikat dengan baris ${first} (habit dan tanggal sama)` });
    else seenRecords.set(key, row);
  });

  plan.habits = file.habits;
  plan.records = file.records;
  plan.settings = mode === "replace" && file.settings && Object.keys(file.settings).length > 0 ? file.settings : null;
  plan.counts = {
    habits: countChanges(file.habits.map((h) => h.id), mode === "merge" ? existingIds : new Set()),
    records: countChanges(
      file.records.map((r) => recordKey(r.habitId, r.date)),
      mode === "merge" ? existing.recordKeys : new Set(),
    ),
    activeAfter,
  };
}

function planCsv(plan: ImportPlan, rows: CsvRecordRow[], existing: ExistingState, today: DateString) {
  const { issues } = plan;
  if (plan.mode === "replace") {
    issues.push({
      scope: "file",
      row: null,
      message: "Impor CSV hanya mendukung mode Gabung: CSV format panjang tidak memuat atribut habit (tanggal mulai, warna, dll.). Gunakan JSON untuk mode Ganti.",
    });
  }

  const byId = new Map(existing.habits.map((h) => [h.id, h]));
  // Cocokkan nama bila id kosong atau tidak dikenal; habit aktif didahulukan.
  const byName = new Map<string, string>();
  for (const h of [...existing.habits].sort((a, b) => Number(b.isActive) - Number(a.isActive))) {
    if (!byName.has(nameKey(h.name))) byName.set(nameKey(h.name), h.id);
  }

  const records: ExportRecord[] = [];
  const seen = new Map<string, number>();
  for (const r of rows) {
    const habitId = byId.has(r.habitId) ? r.habitId : byName.get(nameKey(r.habitName || r.habitId));
    if (!habitId) {
      issues.push({ scope: "csv", row: r.row, message: `habit "${r.habitName || r.habitId}" tidak ditemukan di data lokal` });
      continue;
    }
    if (r.date > today) {
      issues.push({ scope: "csv", row: r.row, message: `tanggal ${r.date} berada di masa depan` });
      continue;
    }
    const key = recordKey(habitId, r.date);
    const first = seen.get(key);
    if (first !== undefined) {
      issues.push({ scope: "csv", row: r.row, message: `duplikat dengan baris ${first} (habit dan tanggal sama)` });
      continue;
    }
    seen.set(key, r.row);
    records.push({ habitId, date: r.date, completed: r.completed, note: r.note });
  }

  plan.records = records;
  plan.counts.records = countChanges(records.map((r) => recordKey(r.habitId, r.date)), existing.recordKeys);
}

function countChanges(keys: string[], existing: ReadonlySet<string>) {
  const updated = keys.filter((k) => existing.has(k)).length;
  return { total: keys.length, created: keys.length - updated, updated };
}
