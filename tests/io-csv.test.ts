import { describe, expect, it } from "vitest";
import { guardCell, parseCsvLong, toCsvLong, toCsvWide, unguardCell } from "@/lib/io/csv";
import { exportFile, habit, record } from "./io-helpers";

describe("guardCell (injeksi rumus spreadsheet)", () => {
  it.each(["=SUM(A1)", "+1", "-1", "@cmd", "\tx"])("memberi tanda petik pada %j", (value) => {
    expect(guardCell(value)).toBe(`'${value}`);
    expect(unguardCell(guardCell(value))).toBe(value);
  });

  it("teks biasa tidak berubah", () => {
    expect(guardCell("Minum Air")).toBe("Minum Air");
    expect(unguardCell("'tanda petik biasa")).toBe("'tanda petik biasa");
  });
});

describe("toCsvLong / parseCsvLong (FR-18.2)", () => {
  const file = exportFile(
    [habit("h1", "Minum Air"), habit("h2", '=HYPERLINK("x")')],
    [
      record("h1", "2026-10-23", { note: 'kata "kutip", koma\nbaris baru' }),
      record("h1", "2026-10-22", { completed: false }),
      record("h2", "2026-10-23", { note: "=1+1" }),
    ],
  );
  const csv = toCsvLong(file);

  it("memakai BOM dan header sesuai PRD", () => {
    expect(csv.startsWith("﻿date,habit_id,habit_name,completed,note\n")).toBe(true);
  });

  it("round-trip: catatan multibaris, tanda kutip, koma, dan sel rumus kembali identik", () => {
    const { rows, issues } = parseCsvLong(csv);
    expect(issues).toEqual([]);
    expect(rows.map(({ date, habitId, habitName, completed, note }) => ({ date, habitId, habitName, completed, note }))).toEqual([
      { date: "2026-10-23", habitId: "h1", habitName: "Minum Air", completed: true, note: 'kata "kutip", koma\nbaris baru' },
      { date: "2026-10-22", habitId: "h1", habitName: "Minum Air", completed: false, note: null },
      { date: "2026-10-23", habitId: "h2", habitName: '=HYPERLINK("x")', completed: true, note: "=1+1" },
    ]);
  });

  it("sel yang berpotensi menjadi rumus diberi tanda petik di berkas", () => {
    expect(csv).toContain(`'=HYPERLINK`);
    expect(csv).toContain(`'=1+1`);
  });
});

describe("parseCsvLong validasi", () => {
  it("melaporkan kolom wajib yang hilang", () => {
    const { issues } = parseCsvLong("tanggal,nilai\n2026-10-23,1");
    expect(issues[0]).toMatchObject({ scope: "csv", row: 1 });
    expect(issues[0].message).toMatch(/date.*completed.*habit_id atau habit_name/);
  });

  it("melaporkan galat per baris dengan nomor baris pada berkas", () => {
    const { rows, issues } = parseCsvLong(
      ["date,habit_id,completed,note", "2026-10-23,a,1,", "2026-13-40,a,1,", "2026-10-22,a,mungkin,", "2026-10-21,,1,", `2026-10-20,a,1,${"x".repeat(201)}`].join("\n"),
    );
    expect(rows.map((r) => r.row)).toEqual([2]);
    expect(issues.map((i) => [i.row, i.message])).toEqual([
      [3, "date tidak valid (gunakan YYYY-MM-DD)"],
      [4, "completed harus 1 atau 0"],
      [5, "habit_id atau habit_name wajib diisi"],
      [6, "note maksimal 200 karakter"],
    ]);
  });

  it("menerima true/false, header berhuruf besar, dan baris kosong", () => {
    const { rows, issues } = parseCsvLong("Date,Habit_ID,Completed\n2026-10-23,a,TRUE\n\n2026-10-22,a,false\n");
    expect(issues).toEqual([]);
    expect(rows.map((r) => r.completed)).toEqual([true, false]);
  });
});

describe("toCsvWide (FR-18.3)", () => {
  const habits = [
    habit("a", "Minum Air", { startDate: "2026-01-01" }),
    habit("b", "Membaca", { startDate: "2026-10-22" }),
    habit("old", "Lama", { startDate: "2025-01-01", isActive: false, archivedAt: "2025-12-31" }),
  ];
  const file = exportFile(habits, [record("a", "2026-10-22"), record("b", "2026-10-22"), record("a", "2026-10-23")]);
  const lines = toCsvWide(file, 2026, "2026-10-23").replace("﻿", "").split("\n");
  const row = (date: string) => lines.find((l) => l.startsWith(date))!;

  it("kolom per habit yang beririsan dengan tahun, ditambah progress; habit yang diarsipkan sebelum tahun itu tidak ikut", () => {
    expect(lines[0]).toBe("date,Minum Air,Membaca,progress");
  });

  it("satu baris per tanggal: 365 hari pada tahun biasa", () => {
    expect(lines).toHaveLength(1 + 365);
  });

  it("nilai 1/0 dan progres dua desimal; di luar rentang eligible dikosongkan", () => {
    expect(row("2026-10-22")).toBe("2026-10-22,1,1,1.00");
    expect(row("2026-10-23")).toBe("2026-10-23,1,0,0.50");
    expect(row("2026-10-21")).toBe("2026-10-21,0,,0.00"); // Membaca belum mulai → kosong
    expect(row("2026-10-24")).toBe("2026-10-24,,,"); // masa depan
  });

  it("tahun kabisat memiliki 366 baris", () => {
    const leap = toCsvWide(file, 2028, "2028-12-31").split("\n");
    expect(leap).toHaveLength(1 + 366);
  });

  it("nama kolom ganda dibedakan", () => {
    const dup = exportFile([habit("a", "Sama"), habit("b", "Sama", { isActive: false, archivedAt: "2026-06-01" })], []);
    expect(toCsvWide(dup, 2026, "2026-10-23").split("\n")[0]).toBe("﻿date,Sama,Sama (2),progress");
  });
});
