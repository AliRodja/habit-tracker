import { expect, test } from "@playwright/test";
import { checkDates, resetWithTwoHabits, shiftDate, today } from "./db";

test.describe.configure({ mode: "serial" });

const t = today();
const api = (page: import("@playwright/test").Page) => page.getByRole("region", { name: /hari beruntun|Api belum menyala/ });

test("api, XP, dan perayaan berubah seketika saat mencentang (FR-21, FR-22)", async ({ page }) => {
  // Minum Air menyala 3 hari sampai kemarin; Membaca baru mulai hari ini.
  await resetWithTwoHabits();
  await checkDates("Minum Air", [shiftDate(t, -3), shiftDate(t, -2), shiftDate(t, -1)]);

  await page.goto("/");
  await expect(api(page).getByRole("heading", { name: "3 hari beruntun" })).toBeVisible();
  await expect(api(page).getByText("Tingkat: Nyala")).toBeVisible();
  await expect(api(page).getByText("Centang satu kebiasaan agar api tetap menyala.")).toBeVisible();
  // 3 Hari Sempurna × (10 + 25) = 105 XP → level 2
  await expect(api(page).getByText("Level 2")).toBeVisible();
  await expect(api(page).getByText("5 / 200 XP menuju level 3")).toBeVisible();

  await page.getByRole("button", { name: /^Minum Air/ }).click();
  await expect(api(page).getByRole("heading", { name: "4 hari beruntun" })).toBeVisible();
  await expect(page.getByText("🔥 Api menyala! 4 hari beruntun")).toBeVisible();
  await expect(page.getByText("+10 XP", { exact: true })).toBeAttached();
  await expect(api(page).getByText("+10 XP hari ini")).toBeVisible();
  await expect(api(page).getByText("Api hari ini sudah menyala.")).toBeVisible();

  await page.getByRole("button", { name: /^Membaca/ }).click();
  await expect(page.getByText("🎉 Hari Sempurna! Bonus +25 XP")).toBeVisible();
  await expect(api(page).getByText("+45 XP hari ini")).toBeVisible();

  await page.reload();
  await expect(api(page).getByRole("heading", { name: "4 hari beruntun" })).toBeVisible();
  await expect(api(page).getByText("+45 XP hari ini")).toBeVisible();

  // Membatalkan semua centang hari ini tidak memadamkan api (hari ini belum selesai).
  await page.getByRole("button", { name: /^Minum Air/ }).click();
  await page.getByRole("button", { name: /^Membaca/ }).click();
  await expect(api(page).getByRole("heading", { name: "3 hari beruntun" })).toBeVisible();
});

test("halaman Pencapaian: lencana terbuka bertanggal dan lencana terkunci dengan progres (FR-23)", async ({ page }) => {
  await resetWithTwoHabits();
  await checkDates("Minum Air", [shiftDate(t, -3), shiftDate(t, -2), shiftDate(t, -1)]);

  await page.goto("/pencapaian");
  await expect(page.getByRole("heading", { name: "Pencapaian" })).toBeVisible();
  await expect(page.getByText("3 hari beruntun")).toBeVisible();

  const card = (title: string) => page.getByRole("listitem").filter({ has: page.getByText(title, { exact: true }) });
  await expect(card("Langkah Pertama").getByText(/^Terbuka /)).toBeVisible();
  await expect(card("Api Menyala").getByText(/^Terbuka /)).toBeVisible();
  await expect(card("Seminggu Menyala").getByText("3 / 7")).toBeVisible();
  await expect(card("Seminggu Menyala").getByRole("progressbar")).toHaveAttribute("aria-valuenow", "3");
  await expect(page.getByText("Cara mendapatkan hadiah")).toBeVisible();
});

test("notifikasi muncul saat lencana baru terbuka, tetapi tidak membanjiri kunjungan pertama (FR-24)", async ({ page }) => {
  await resetWithTwoHabits();
  await checkDates("Minum Air", [shiftDate(t, -2), shiftDate(t, -1)]);

  // Kunjungan pertama: lencana yang sudah terbuka (Langkah Pertama, dll.) hanya dicatat, tanpa notifikasi.
  await page.goto("/");
  await expect(api(page).getByRole("heading", { name: "2 hari beruntun" })).toBeVisible();
  await expect(page.getByText("Pencapaian baru!")).toHaveCount(0);

  // Centang hari ini → 3 hari beruntun → lencana "Api Menyala" terbuka.
  await page.getByRole("button", { name: /^Minum Air/ }).click();
  await expect(page.getByText("Pencapaian baru!")).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Pencapaian baru!" })).toContainText("Api Menyala");

  await page.getByRole("button", { name: "Tutup notifikasi" }).click();
  await expect(page.getByText("Pencapaian baru!")).toHaveCount(0);
  await page.reload();
  await expect(api(page).getByRole("heading", { name: "3 hari beruntun" })).toBeVisible();
  await expect(page.getByText("Pencapaian baru!")).toHaveCount(0); // sudah dilihat
});
