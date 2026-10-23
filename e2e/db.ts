import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { shiftDate, todayIn } from "../lib/dates";

// Playwright memuat berkas e2e sebagai CommonJS, sedangkan Prisma Client hasil generate adalah ESM.
// Karena itu data uji disiapkan langsung ke SQLite e2e memakai node:sqlite bawaan Node.
const DB_FILE = "data/e2e.db";

export const today = () => todayIn("Asia/Jakarta");
export { shiftDate };

const now = () => new Date().toISOString().replace("Z", "+00:00");

function open() {
  const db = new DatabaseSync(DB_FILE);
  db.exec("PRAGMA busy_timeout = 5000");
  return db;
}

/** Kosongkan database e2e lalu buat dua habit: "Minum Air" (mulai 10 hari lalu) dan "Membaca" (mulai hari ini). */
export async function resetWithTwoHabits() {
  const db = open();
  try {
    db.exec("DELETE FROM HabitRecord; DELETE FROM Habit;");
    const insert = db.prepare(
      "INSERT INTO Habit (id, name, target, color, orderIndex, isActive, startDate, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)",
    );
    insert.run(randomUUID(), "Minum Air", "8 gelas", "sky", 0, shiftDate(today(), -10), now(), now());
    insert.run(randomUUID(), "Membaca", null, "violet", 1, today(), now(), now());
  } finally {
    db.close();
  }
}

export async function recordFor(habitName: string, date: string) {
  const db = open();
  try {
    const row = db
      .prepare(
        "SELECT r.completed AS completed, r.note AS note FROM HabitRecord r JOIN Habit h ON h.id = r.habitId WHERE h.name = ? AND r.date = ?",
      )
      .get(habitName, date) as { completed: number; note: string | null } | undefined;
    return row ? { completed: row.completed === 1, note: row.note } : null;
  } finally {
    db.close();
  }
}

/** Centang `habitName` pada tanggal-tanggal tertentu (langsung ke database e2e). */
export async function checkDates(habitName: string, dates: string[]) {
  const db = open();
  try {
    const habit = db.prepare("SELECT id FROM Habit WHERE name = ?").get(habitName) as { id: string };
    const insert = db.prepare("INSERT INTO HabitRecord (id, habitId, date, completed, updatedAt) VALUES (?, ?, ?, 1, ?)");
    for (const date of dates) insert.run(randomUUID(), habit.id, date, now());
  } finally {
    db.close();
  }
}

/** Kembalikan pengaturan ke default agar tes lain tidak terpengaruh zona waktu atau tema. */
export async function resetSettings() {
  const db = open();
  try {
    db.exec("DELETE FROM Setting");
  } finally {
    db.close();
  }
}
