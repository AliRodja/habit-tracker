import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { buildCompletionIndex } from "@/lib/metrics";
import { buildImportPlan, parseImportText } from "@/lib/io/plan";
import { toCsvLong } from "@/lib/io/csv";
import { buildYearlyReport } from "@/lib/reports";
import { writeBackup } from "@/lib/services/backup-service";
import { resetAllData } from "@/lib/services/data-service";
import { buildExportFile } from "@/lib/services/export-service";
import { executeImportPlan, loadExistingState, previewImport, runImport } from "@/lib/services/import-service";
import { getSettings, updateSettings } from "@/lib/services/settings-store";

const today = "2026-10-23";
let backupDir: string;

async function seed() {
  const water = await db.habit.create({ data: { name: "Minum Air", target: "8 gelas", color: "sky", orderIndex: 0, startDate: "2026-10-01" } });
  const read = await db.habit.create({ data: { name: "Membaca", description: "10 halaman", color: "violet", orderIndex: 1, startDate: "2026-10-10" } });
  const old = await db.habit.create({ data: { name: "Lama", color: "rose", orderIndex: 2, isActive: false, startDate: "2026-01-01", archivedAt: "2026-06-01" } });
  await db.habitRecord.createMany({
    data: [
      { habitId: water.id, date: "2026-10-20", completed: true },
      { habitId: water.id, date: "2026-10-21", completed: true, note: 'catatan, "berkutip"\nbaris dua' },
      { habitId: water.id, date: "2026-10-22", completed: false, note: "sakit" },
      { habitId: read.id, date: "2026-10-20", completed: true },
      { habitId: old.id, date: "2026-05-01", completed: true },
    ],
  });
  await db.setting.createMany({ data: [{ key: "timezone", value: "Asia/Makassar" }, { key: "weekStartsOn", value: "0" }, { key: "theme", value: "dark" }] });
  return { water, read, old };
}

const counts = async () => ({ habits: await db.habit.count(), records: await db.habitRecord.count() });
const withoutTimestamp = <T extends { exportedAt?: string }>(file: T) => ({ ...file, exportedAt: "" });

beforeEach(async () => {
  await db.habitRecord.deleteMany();
  await db.habit.deleteMany();
  await db.setting.deleteMany();
  backupDir = await mkdtemp(path.join(tmpdir(), "habit-backup-test-"));
});
afterEach(() => rm(backupDir, { recursive: true, force: true }));

describe("TC-17: ekspor-impor round-trip", () => {
  it("mode Ganti dengan berkas ekspor mengembalikan seluruh data persis, termasuk laporan", async () => {
    await seed();
    const before = await buildExportFile();
    const text = JSON.stringify(before);

    // Ubah keadaan lokal agar pemulihan benar-benar terbukti.
    await db.habit.create({ data: { name: "Sampah", orderIndex: 9, startDate: "2026-10-01" } });
    await db.habitRecord.deleteMany({ where: { date: "2026-10-20" } });
    await db.setting.deleteMany();

    const outcome = await runImport(text, "cadangan.json", "replace", today, { backupDir });
    expect(outcome).toMatchObject({ applied: true });

    const after = await buildExportFile();
    expect(withoutTimestamp(after)).toEqual(withoutTimestamp(before));

    const report = (file: typeof before) =>
      buildYearlyReport(
        file.habits.map((h) => ({ ...h })),
        buildCompletionIndex(file.records),
        2026,
        today,
      );
    expect(report(after)).toEqual(report(before));
  });

  it("CSV format panjang hasil ekspor dapat digabungkan kembali tanpa kehilangan catatan", async () => {
    const { water } = await seed();
    const csv = toCsvLong(await buildExportFile());
    await db.habitRecord.deleteMany({ where: { habitId: water.id } });

    const outcome = await runImport(csv, "catatan.csv", "merge", today);
    expect(outcome.applied).toBe(true);
    const restored = await db.habitRecord.findMany({ where: { habitId: water.id }, orderBy: { date: "asc" } });
    expect(restored.map((r) => [r.date, r.completed, r.note])).toEqual([
      ["2026-10-20", true, null],
      ["2026-10-21", true, 'catatan, "berkutip"\nbaris dua'],
      ["2026-10-22", false, "sakit"],
    ]);
  });
});

describe("TC-18: berkas rusak", () => {
  it("tidak mengubah data dan tidak membuat cadangan", async () => {
    await seed();
    const before = await buildExportFile();

    for (const [text, name] of [["{ rusak", "a.json"], ['{"app":"lain"}', "b.json"], ["x,y\n1,2", "c.csv"]] as const) {
      const outcome = await runImport(text, name, "replace", today, { backupDir });
      expect(outcome.applied).toBe(false);
      expect(outcome.plan.canApply).toBe(false);
      expect(outcome.plan.issues.length).toBeGreaterThan(0);
    }
    expect(withoutTimestamp(await buildExportFile())).toEqual(withoutTimestamp(before));
    expect(await readdir(backupDir)).toEqual([]);
  });
});

describe("TC-19: mode Ganti", () => {
  it("membuat cadangan otomatis berisi data lama sebelum penggantian", async () => {
    await seed();
    const old = await buildExportFile();
    const incoming = JSON.stringify({
      app: "daily-habit-tracker",
      schemaVersion: 1,
      habits: [{ id: "baru-1", name: "Baru", color: "teal", orderIndex: 0, isActive: true, startDate: "2026-10-01" }],
      records: [{ habitId: "baru-1", date: "2026-10-02", completed: true }],
    });

    const outcome = await runImport(incoming, "baru.json", "replace", today, { backupDir });
    expect(outcome.applied).toBe(true);
    expect(outcome.backupPath).toBeDefined();

    const files = await readdir(backupDir);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/^habit-tracker-backup-\d{8}-\d{6}-sebelum-impor\.json$/);
    const backup = JSON.parse(await readFile(outcome.backupPath!, "utf8"));
    expect(withoutTimestamp(backup)).toEqual(withoutTimestamp(old));

    expect((await db.habit.findMany()).map((h) => h.name)).toEqual(["Baru"]);
    expect(await db.habitRecord.count()).toBe(1);
  });

  it("mode Gabung tidak membuat cadangan", async () => {
    await seed();
    const outcome = await runImport(
      JSON.stringify({ app: "daily-habit-tracker", schemaVersion: 1, habits: [], records: [{ habitId: (await db.habit.findFirstOrThrow()).id, date: "2026-10-05", completed: true }] }),
      "x.json",
      "merge",
      today,
      { backupDir },
    );
    expect(outcome.applied).toBe(true);
    expect(outcome.backupPath).toBeUndefined();
    expect(await readdir(backupDir)).toEqual([]);
  });

  it("pengaturan pada berkas dipulihkan hanya pada mode Ganti", async () => {
    const text = JSON.stringify({
      app: "daily-habit-tracker",
      schemaVersion: 1,
      settings: { timezone: "Asia/Jayapura", theme: "light" },
      habits: [{ id: "h", name: "H", color: "sky", orderIndex: 0, isActive: true, startDate: "2026-10-01" }],
      records: [],
    });
    await runImport(text, "x.json", "merge", today);
    expect((await getSettings()).timezone).toBe("Asia/Jakarta");

    await runImport(text, "x.json", "replace", today, { backupDir });
    expect(await getSettings()).toMatchObject({ timezone: "Asia/Jayapura", theme: "light", weekStartsOn: "1" });
  });
});

describe("mode Gabung (upsert)", () => {
  it("file menimpa data lokal yang bentrok; data lokal lain tetap; urutan dirapatkan", async () => {
    const { water, read } = await seed();
    const incoming = JSON.stringify({
      app: "daily-habit-tracker",
      schemaVersion: 1,
      habits: [
        { id: water.id, name: "Minum Air Putih", color: "emerald", orderIndex: 5, isActive: true, startDate: "2026-10-01" },
        { id: "baru", name: "Meditasi", color: "teal", orderIndex: 5, isActive: true, startDate: "2026-10-01" },
      ],
      records: [
        { habitId: water.id, date: "2026-10-22", completed: true, note: null },
        { habitId: water.id, date: "2026-10-23", completed: true, note: "baru" },
        { habitId: "baru", date: "2026-10-23", completed: true },
      ],
    });

    const preview = await previewImport(incoming, "x.json", "merge", today);
    expect(preview.counts).toEqual({
      habits: { total: 2, created: 1, updated: 1 },
      records: { total: 3, created: 2, updated: 1 },
      activeAfter: 3,
    });
    expect(await db.habit.count()).toBe(3); // pratinjau tidak mengubah apa pun

    expect((await runImport(incoming, "x.json", "merge", today)).applied).toBe(true);

    expect(await db.habit.findUniqueOrThrow({ where: { id: water.id } })).toMatchObject({ name: "Minum Air Putih", color: "emerald" });
    expect(await db.habit.findUniqueOrThrow({ where: { id: read.id } })).toMatchObject({ name: "Membaca" }); // tidak ada di berkas → utuh
    expect(await db.habitRecord.findUniqueOrThrow({ where: { habitId_date: { habitId: water.id, date: "2026-10-22" } } })).toMatchObject({ completed: true, note: null });
    expect(await db.habitRecord.count({ where: { habitId: water.id } })).toBe(4);

    const active = await db.habit.findMany({ where: { isActive: true }, orderBy: { orderIndex: "asc" } });
    expect(active.map((h) => h.orderIndex)).toEqual([0, 1, 2]);
  });
});

describe("transaksi (FR-19.5)", () => {
  it("kegagalan di tengah penerapan membatalkan seluruh perubahan, termasuk penghapusan", async () => {
    await seed();
    const before = await buildExportFile();
    const plan = buildImportPlan(
      parseImportText(JSON.stringify({ app: "daily-habit-tracker", schemaVersion: 1, habits: [{ id: "x", name: "X", color: "sky", orderIndex: 0, isActive: true, startDate: "2026-10-01" }], records: [] }), "x.json"),
      await loadExistingState(),
      "replace",
      today,
    );
    // Rencana yang dipalsukan (melewati validasi): id ganda memicu pelanggaran unik setelah data lama dihapus.
    const forged = { ...plan, habits: [...plan.habits, ...plan.habits] };

    await expect(executeImportPlan(forged)).rejects.toThrow();
    expect(withoutTimestamp(await buildExportFile())).toEqual(withoutTimestamp(before));
  });
});

describe("resetAllData (FR-20)", () => {
  it("konfirmasi salah: tidak ada yang dihapus dan tidak ada cadangan", async () => {
    await seed();
    const result = await resetAllData("hapus", backupDir);
    expect(result).toMatchObject({ ok: false });
    expect(await counts()).toEqual({ habits: 3, records: 5 });
    expect(await readdir(backupDir)).toEqual([]);
  });

  it("membuat cadangan otomatis lalu menghapus habit dan catatan, pengaturan tetap", async () => {
    await seed();
    const before = await buildExportFile();
    const result = await resetAllData("HAPUS", backupDir);

    expect(result.ok).toBe(true);
    expect(await counts()).toEqual({ habits: 0, records: 0 });
    expect((await getSettings()).theme).toBe("dark");

    const files = await readdir(backupDir);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/-sebelum-hapus\.json$/);
    const backup = JSON.parse(await readFile(path.join(backupDir, files[0]), "utf8"));
    expect(withoutTimestamp(backup)).toEqual(withoutTimestamp(before));

    // Cadangan itu sendiri dapat dipulihkan.
    expect((await runImport(JSON.stringify(backup), "pulih.json", "replace", today, { backupDir })).applied).toBe(true);
    expect(await counts()).toEqual({ habits: 3, records: 5 });
  });
});

describe("writeBackup", () => {
  it("menolak menimpa cadangan yang sudah ada pada detik yang sama", async () => {
    await seed();
    const now = new Date("2026-10-23T10:00:00Z");
    await writeBackup("uji", backupDir, now);
    await expect(writeBackup("uji", backupDir, now)).rejects.toThrow(/EEXIST/);
  });
});

describe("updateSettings (FR-20)", () => {
  const valid = { timezone: "Asia/Makassar", weekStartsOn: "0", theme: "dark", maxActiveHabits: "7" };

  it("menyimpan nilai yang valid", async () => {
    expect(await updateSettings(valid)).toEqual({ ok: true });
    expect(await getSettings()).toEqual(valid);
  });

  it("menolak zona waktu, awal minggu, tema, dan batas habit tidak valid tanpa menyimpan apa pun", async () => {
    const result = await updateSettings({ timezone: "Mars/Olympus", weekStartsOn: "3", theme: "neon", maxActiveHabits: "11" });
    expect(result).toMatchObject({ ok: false, fieldErrors: { timezone: ["Zona waktu tidak valid"], maxActiveHabits: ["Pilih batas antara 1 dan 10"] } });
    expect(!result.ok && Object.keys(result.fieldErrors ?? {}).sort()).toEqual(["maxActiveHabits", "theme", "timezone", "weekStartsOn"]);
    expect(await db.setting.count()).toBe(0);
  });

  it.each(["0", "abc", "2.5", ""])("menolak batas habit %j", async (maxActiveHabits) => {
    expect((await updateSettings({ ...valid, maxActiveHabits })).ok).toBe(false);
  });

  it("menolak menurunkan batas di bawah jumlah habit aktif, dengan petunjuk jumlah yang perlu diarsipkan", async () => {
    await seed(); // 2 habit aktif
    const result = await updateSettings({ ...valid, maxActiveHabits: "1" });
    expect(result).toMatchObject({ ok: false, fieldErrors: { maxActiveHabits: [expect.stringMatching(/ada 2 habit aktif\. Arsipkan 1 habit/)] } });
    expect(await db.setting.count({ where: { key: "maxActiveHabits" } })).toBe(0); // tidak ada yang tersimpan sebagian
    expect((await updateSettings({ ...valid, maxActiveHabits: "2" })).ok).toBe(true); // sama dengan jumlah aktif: boleh
  });
});
