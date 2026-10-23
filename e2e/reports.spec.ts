import { expect, test } from "@playwright/test";
import { checkDates, resetWithTwoHabits, shiftDate, today } from "./db";

test.describe.configure({ mode: "serial" });

// "Minum Air" (mulai 10 hari lalu) dicentang 3 hari berturut-turut sampai kemarin; "Membaca" mulai hari ini.
test.beforeEach(async () => {
  await resetWithTwoHabits();
  const t = today();
  await checkDates("Minum Air", [shiftDate(t, -3), shiftDate(t, -2), shiftDate(t, -1)]);
});

test("laporan mingguan: tingkat, kartu ringkasan, grafik, tabel, dan tabel per habit (FR-14)", async ({ page }) => {
  await page.goto("/reports/weekly");
  await expect(page.getByRole("heading", { name: "Laporan Mingguan" })).toBeVisible();

  // 7 hari terakhir: Minum Air 7 hari eligible (3 tercentang) + Membaca 1 hari = 3 dari 8 habit-hari
  await expect(page.getByText("3 dari 8 habit-hari")).toBeVisible();
  await expect(page.getByText("38%", { exact: true }).first()).toBeVisible();
  // periode sebelumnya punya 4 habit-hari eligible tanpa centang → 0% (bukan kosong), jadi delta naik 37,5 poin
  await expect(page.getByText("Naik 37,5 poin dari 7 hari sebelumnya")).toBeVisible();

  await expect(page.getByRole("img", { name: /Grafik batang progres harian/ })).toBeVisible();
  await expect(page.locator(".recharts-bar-rectangle")).toHaveCount(7); // satu kolom per hari

  const row = page.getByRole("row").filter({ hasText: "Minum Air" });
  await expect(row).toContainText("3/7");

  await page.getByText("Lihat sebagai tabel").click();
  await expect(page.getByRole("table", { name: "Progres harian" })).toBeVisible();

  // minggu kalender dapat dinavigasi mundur
  await page.getByRole("link", { name: "Minggu kalender" }).click();
  await expect(page).toHaveURL(/mode=calendar/);
  await expect(page.getByRole("link", { name: "Minggu sebelumnya" })).toBeVisible();
});

test("laporan bulanan: bulan tanpa habit-hari kosong, bukan 0% (FR-15)", async ({ page }) => {
  const t = today();
  test.skip(Number(t.slice(5, 7)) < 5, "butuh bulan sebelum habit dimulai pada tahun yang sama");

  await page.goto("/reports/monthly");
  await expect(page.getByRole("img", { name: /Grafik batang tingkat penyelesaian per bulan/ })).toBeVisible();
  await expect(page.getByRole("img", { name: /per habit/ })).toBeVisible();

  await page.getByRole("link", { name: "Jan", exact: true }).click();
  await expect(page).toHaveURL(/m=\d{4}-01/);
  const tile = page.locator("div", { has: page.getByText(/^Tingkat Januari/) }).filter({ hasText: "–" }).first();
  await expect(tile).toBeVisible();
  await expect(page.getByText("Belum ada habit pada bulan ini.")).toBeVisible();
});

test("laporan tahunan: ringkasan, heatmap dengan tooltip, pola hari, dan streak (FR-16, TC-16)", async ({ page }) => {
  const t = today();
  const day = shiftDate(t, -1);
  test.skip(day.slice(0, 4) !== t.slice(0, 4) || shiftDate(day, -7).slice(0, 4) !== t.slice(0, 4), "tanggal uji melintasi pergantian tahun");

  await page.goto("/reports/yearly");
  await expect(page.getByText("Total centang")).toBeVisible();
  await expect(page.locator("[data-heat]")).not.toHaveCount(0);

  // TC-16: tooltip menampilkan tanggal, jumlah centang, dan persentase
  await page.locator(`[data-date="${day}"]`).hover();
  const tooltip = page.getByRole("tooltip");
  await expect(tooltip).toContainText("1 dari 1 selesai · 100%");

  // level 4 (Hari Sempurna) untuk hari tercentang penuh; level 0 untuk hari tanpa centang
  await expect(page.locator(`[data-date="${day}"]`)).toHaveAttribute("data-heat", "4");
  await expect(page.locator(`[data-date="${t}"]`)).toHaveAttribute("data-heat", "0");

  // navigasi keyboard: panah kiri = minggu sebelumnya
  await page.locator(`[data-date="${day}"]`).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator(`[data-date="${shiftDate(day, -7)}"]`)).toBeFocused();

  await expect(page.getByRole("img", { name: /per hari dalam seminggu/ })).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "Minum Air" })).toContainText("3 hari");
});

test("/reports mengarah ke laporan mingguan", async ({ page }) => {
  await page.goto("/reports");
  await expect(page).toHaveURL(/\/reports\/weekly/);
});
