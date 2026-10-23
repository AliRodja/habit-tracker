import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { checkDates, resetSettings, resetWithTwoHabits, shiftDate, today } from "./db";

test.describe.configure({ mode: "serial" });

const BACKUP_DIR = path.resolve("data/e2e-backups");
const backups = () => (existsSync(BACKUP_DIR) ? readdirSync(BACKUP_DIR) : []);

test.beforeEach(async () => {
  await resetWithTwoHabits();
  await checkDates("Minum Air", [shiftDate(today(), -2), shiftDate(today(), -1)]);
});
test.afterEach(resetSettings);

const upload = (page: Page, name: string, content: string, type = "application/json") =>
  page.setInputFiles("#import-file", { name, mimeType: type, buffer: Buffer.from(content) });

const habitJson = (id: string, name: string, orderIndex = 0) => ({
  id,
  name,
  color: "teal",
  orderIndex,
  isActive: true,
  startDate: shiftDate(today(), -5),
});

test("pengaturan: tema, awal minggu, dan zona waktu tersimpan dan bertahan setelah muat ulang (FR-20)", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.+/);

  await page.getByText("Gelap", { exact: true }).click();
  await page.getByText("Minggu", { exact: true }).click();
  await page.getByLabel("Zona waktu").selectOption("Asia/Makassar");
  await page.getByRole("button", { name: "Simpan pengaturan" }).click();
  await expect(page.getByText("Pengaturan disimpan.")).toBeVisible();

  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(12, 10, 9)");

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByLabel("Zona waktu")).toHaveValue("Asia/Makassar");
  await expect(page.getByLabel("Minggu", { exact: true })).toBeChecked();

  // Token warna ikut berganti mengikuti data-theme, bukan hanya pengaturan OS.
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--danger").trim())).toBe("#f87171");

  await page.getByText("Ikuti sistem", { exact: true }).click();
  await page.getByRole("button", { name: "Simpan pengaturan" }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.+/);
});

test("pengaturan: batas habit aktif dapat dinaikkan, dan tidak bisa diturunkan di bawah jumlah habit aktif", async ({ page }) => {
  await page.goto("/settings");
  await page.getByLabel("Batas habit aktif").selectOption("3");
  await page.getByRole("button", { name: "Simpan pengaturan" }).click();
  await expect(page.getByText("Pengaturan disimpan.")).toBeVisible();

  await page.goto("/habits");
  await expect(page.getByText("2 dari 3 habit aktif")).toBeVisible();
  await expect(page.getByRole("button", { name: "Tambah habit" })).toBeVisible();

  // 2 habit aktif: batas 1 ditolak dengan petunjuk, nilai lama tetap tersimpan
  await page.goto("/settings");
  await page.getByLabel("Batas habit aktif").selectOption("1");
  await page.getByRole("button", { name: "Simpan pengaturan" }).click();
  await expect(page.getByText(/Saat ini ada 2 habit aktif\. Arsipkan 1 habit/)).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Batas habit aktif")).toHaveValue("3");

  // Batas 2 = jumlah aktif: halaman Habit menunjukkan penuh dan menawarkan menaikkan batas
  await page.getByLabel("Batas habit aktif").selectOption("2");
  await page.getByRole("button", { name: "Simpan pengaturan" }).click();
  await expect(page.getByText("Pengaturan disimpan.")).toBeVisible();
  await page.goto("/habits");
  await expect(page.getByText(/Semua 2 slot sedang terpakai/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Tambah habit" })).toHaveCount(0);
  await page.getByRole("link", { name: "naikkan batasnya di Pengaturan" }).click();
  await expect(page).toHaveURL(/\/settings#umum/);
});

test("pengaturan: menampilkan lokasi file database dan folder cadangan (FR-17)", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByText(path.resolve("data/e2e.db"))).toBeVisible();
  await expect(page.getByText(BACKUP_DIR)).toBeVisible();
});

test("ekspor: JSON, CSV panjang, dan CSV lebar dengan nama berkas bertanda waktu (FR-18)", async ({ page }) => {
  await page.goto("/settings");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Unduh JSON" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^habit-tracker-\d{8}-\d{4}\.json$/);

  const json = await (await page.request.get("/api/export?format=json")).json();
  expect(json).toMatchObject({ app: "daily-habit-tracker", schemaVersion: 1, settings: { timezone: "Asia/Jakarta" } });
  expect(json.habits.map((h: { name: string }) => h.name)).toEqual(["Minum Air", "Membaca"]);
  expect(json.records).toHaveLength(2);

  const long = await page.request.get("/api/export?format=csv-long");
  expect(long.headers()["content-disposition"]).toMatch(/habit-tracker-\d{8}-\d{4}\.csv/);
  expect(await long.text()).toContain("date,habit_id,habit_name,completed,note");

  const wide = await (await page.request.get(`/api/export?format=csv-wide&year=${today().slice(0, 4)}`)).text();
  expect(wide.split("\n")[0]).toBe("﻿date,Minum Air,Membaca,progress");

  expect((await page.request.get("/api/export?format=xml")).status()).toBe(400);
});

test("keamanan: permintaan lintas situs dan Host asing ditolak (NFR-02)", async ({ page, baseURL }) => {
  const file = { name: "x.json", mimeType: "application/json", buffer: Buffer.from("{}") };

  const crossSite = await page.request.post("/api/import?mode=replace", { multipart: { file }, headers: { origin: "http://evil.example" } });
  expect(crossSite.status()).toBe(403);

  const rebinding = await page.request.get("/api/export?format=json", { headers: { host: "evil.example" } });
  expect(rebinding.status()).toBe(403);

  // Permintaan same-origin yang sah tetap lolos sampai validasi isi berkas.
  const sameOrigin = await page.request.post("/api/import?mode=merge&dryRun=true", { multipart: { file }, headers: { origin: baseURL! } });
  expect(sameOrigin.status()).toBe(200);
  expect((await sameOrigin.json()).canApply).toBe(false);
});

test("impor: berkas rusak menampilkan galat dan tidak mengubah data (TC-18)", async ({ page }) => {
  await page.goto("/settings");
  await upload(page, "rusak.json", '{ "app": "daily-habit-tracker", "schemaVersion": 1, "habits": [{ "id": "x", "name": "" }], "records": [] }');
  await page.getByRole("button", { name: "Periksa berkas" }).click();

  await expect(page.getByText(/galat ditemukan/)).toBeVisible();
  await expect(page.getByText(/Habit baris 1/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Terapkan impor" })).toHaveCount(0);

  await page.goto("/habits");
  await expect(page.locator('section[aria-labelledby="active-title"] li')).toHaveCount(2);
});

test("impor: pratinjau lalu Gabung menambah habit tanpa menghapus data lokal (FR-19)", async ({ page }) => {
  const file = JSON.stringify({
    app: "daily-habit-tracker",
    schemaVersion: 1,
    habits: [habitJson("e2e-baru", "Meditasi", 2)],
    records: [{ habitId: "e2e-baru", date: shiftDate(today(), -1), completed: true }],
  });
  await page.goto("/settings");
  await upload(page, "gabung.json", file);
  await page.getByRole("button", { name: "Periksa berkas" }).click();

  const preview = page.getByText(/Pratinjau · JSON · mode Gabung/);
  await expect(preview).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "Habit" }).first()).toContainText("1");
  await expect(page.getByText("Habit aktif setelah impor: 3")).toBeVisible();

  await page.getByRole("button", { name: "Terapkan impor" }).click();
  await expect(page.getByText(/Impor berhasil: 1 habit dan 1 catatan/)).toBeVisible();
  expect(backups()).toEqual([]); // Gabung tidak membuat cadangan

  await page.goto("/habits");
  await expect(page.locator('section[aria-labelledby="active-title"] li p.font-semibold')).toHaveText(["Minum Air", "Membaca", "Meditasi"]);
});

test("impor: mode Ganti butuh konfirmasi dan membuat cadangan otomatis (FR-19.4, TC-19)", async ({ page }) => {
  const file = JSON.stringify({ app: "daily-habit-tracker", schemaVersion: 1, habits: [habitJson("e2e-ganti", "Satu-satunya")], records: [] });
  await page.goto("/settings");
  await upload(page, "ganti.json", file);
  await page.getByText("Ganti", { exact: true }).click();
  await page.getByRole("button", { name: "Periksa berkas" }).click();

  const apply = page.getByRole("button", { name: "Ganti seluruh data" });
  await expect(apply).toBeDisabled();
  await page.getByLabel(/Saya mengerti/).check();
  await apply.click();

  await expect(page.getByText(/Impor berhasil/)).toBeVisible();
  await expect(page.getByText(/Cadangan data sebelumnya disimpan di/)).toBeVisible();

  const files = backups();
  expect(files).toHaveLength(1);
  expect(files[0]).toMatch(/-sebelum-impor\.json$/);
  const backup = JSON.parse(readFileSync(path.join(BACKUP_DIR, files[0]), "utf8"));
  expect(backup.habits.map((h: { name: string }) => h.name)).toEqual(["Minum Air", "Membaca"]);

  await page.goto("/habits");
  await expect(page.locator('section[aria-labelledby="active-title"] li p.font-semibold')).toHaveText(["Satu-satunya"]);
});

test("impor: CSV hanya mendukung mode Gabung dan menggabungkan catatan berdasarkan nama habit", async ({ page }) => {
  const date = shiftDate(today(), -3);
  await page.goto("/settings");
  await upload(page, "catatan.csv", `date,habit_id,habit_name,completed,note\n${date},,Minum Air,1,dari csv\n`, "text/csv");
  await expect(page.getByLabel(/Ganti/)).toBeDisabled();
  await page.getByRole("button", { name: "Periksa berkas" }).click();
  await expect(page.getByText(/Pratinjau · CSV · mode Gabung/)).toBeVisible();
  await page.getByRole("button", { name: "Terapkan impor" }).click();
  await expect(page.getByText(/Impor berhasil: 0 habit dan 1 catatan/)).toBeVisible();

  const csv = await (await page.request.get("/api/export?format=csv-long")).text();
  expect(csv).toContain(`${date},`);
  expect(csv).toContain("dari csv");
});

test("zona bahaya: hapus semua data membuat cadangan dan butuh ketikan HAPUS (FR-20)", async ({ page }) => {
  await page.goto("/settings");
  const button = page.getByRole("button", { name: "Hapus Semua Data" });
  await expect(button).toBeDisabled();
  await page.getByLabel(/Ketik HAPUS/).fill("hapus");
  await expect(button).toBeDisabled();
  await page.getByLabel(/Ketik HAPUS/).fill("HAPUS");
  await button.click();

  await expect(page.getByText(/Cadangan otomatis disimpan di/)).toBeVisible();
  const files = backups().filter((f) => f.endsWith("-sebelum-hapus.json"));
  expect(files).toHaveLength(1);
  const backup = JSON.parse(readFileSync(path.join(BACKUP_DIR, files[0]), "utf8"));
  expect(backup.habits).toHaveLength(2);

  await page.goto("/habits");
  await expect(page.getByText("Belum ada habit aktif")).toBeVisible();
});
