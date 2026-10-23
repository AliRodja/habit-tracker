import { expect, test } from "@playwright/test";
import { startOfWeek } from "../lib/dates";
import { checkDates, resetSettings, resetWithTwoHabits, setSetting, shiftDate, today } from "./db";

test.describe.configure({ mode: "serial" });
test.afterEach(resetSettings);

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

const challengeRow = (page: import("@playwright/test").Page, title: string | RegExp) =>
  page.getByRole("region", { name: "Tantangan minggu ini" }).getByRole("listitem").filter({ hasText: title });

test("tantangan mingguan: progres bertambah seketika dan perayaan saat selesai (FR-25)", async ({ page }) => {
  await resetWithTwoHabits(); // Minum Air mulai 10 hari lalu, Membaca mulai hari ini
  const weekStart = startOfWeek(t, 1);
  // Dua hari sebelum hari ini dalam minggu ini dicentang → 2 Hari Sempurna (hanya Minum Air yang berjalan).
  const before = [shiftDate(t, -2), shiftDate(t, -1)].filter((d) => d >= weekStart);
  await checkDates("Minum Air", before);

  await page.goto("/");
  const week = page.getByRole("region", { name: "Tantangan minggu ini" });
  await expect(week).toBeVisible();
  await expect(challengeRow(page, "Nyalakan api 7 hari")).toContainText(`${before.length} / 7`);
  // Habit fokus = habit paling tertinggal minggu lalu (Minum Air: 0%; Membaca belum berjalan).
  await expect(challengeRow(page, "Fokus Minum Air: 5 hari")).toContainText(`${before.length} / 5`);

  await page.getByRole("button", { name: /^Minum Air/ }).click();
  await expect(challengeRow(page, "Nyalakan api 7 hari")).toContainText(`${before.length + 1} / 7`);
  await expect(challengeRow(page, "Fokus Minum Air: 5 hari")).toContainText(`${before.length + 1} / 5`);

  test.skip(before.length < 2, "hari ini terlalu awal dalam minggu untuk menyelesaikan 3 Hari Sempurna");
  await page.getByRole("button", { name: /^Membaca/ }).click();
  await expect(page.getByText("🎯 Tantangan selesai: 3 Hari Sempurna! +50 XP")).toBeVisible();
  await expect(challengeRow(page, "3 Hari Sempurna")).toContainText("Selesai · +50 XP");
  // XP hari ini: 2 centang (20) + Hari Sempurna (25) + tantangan (50)
  await expect(api(page).getByText("+95 XP hari ini")).toBeVisible();

  await page.reload();
  await expect(challengeRow(page, "3 Hari Sempurna")).toContainText("Selesai · +50 XP");
  await expect(api(page).getByText("+95 XP hari ini")).toBeVisible();
});

test("medali per habit di halaman Pencapaian (FR-26)", async ({ page }) => {
  await resetWithTwoHabits();
  await checkDates("Minum Air", Array.from({ length: 7 }, (_, i) => shiftDate(t, -8 + i))); // T-8..T-2

  await page.goto("/pencapaian");
  const medals = page.getByRole("list", { name: "Medali Minum Air" });
  await expect(medals.getByRole("listitem").filter({ hasText: "Perunggu" })).toContainText("diraih");
  await expect(medals.getByRole("listitem").filter({ hasText: "Perak" })).toContainText("belum diraih");
  await expect(page.getByText("14 hari lagi menuju medali Perak")).toBeVisible();
  await expect(page.getByText("7 hari lagi menuju medali Perunggu")).toBeVisible(); // Membaca: 0 hari
});

test("gamifikasi dapat dimatikan: dashboard tenang dan menu Pencapaian tersembunyi (FR-27)", async ({ page }) => {
  await resetWithTwoHabits();
  await page.goto("/settings");
  await page.getByText("Nonaktif", { exact: true }).click();
  await page.getByRole("button", { name: "Simpan pengaturan" }).click();
  await expect(page.getByText("Pengaturan disimpan.")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-gamification", "off");
  const nav = page.getByRole("navigation", { name: "Navigasi utama" });
  await expect(nav.getByRole("link", { name: "Pencapaian" })).toBeHidden();

  await page.goto("/");
  await expect(page.getByRole("region", { name: "Ringkasan hari ini" })).toBeVisible();
  await expect(page.getByRole("region", { name: /hari beruntun|Api belum menyala/ })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Tantangan minggu ini" })).toHaveCount(0);
  await page.getByRole("button", { name: /^Minum Air/ }).click();
  await expect(page.getByText("1 dari 2 selesai")).toBeVisible();
  await expect(page.getByText(/Api menyala!/)).toHaveCount(0);

  // Halaman Pencapaian tetap bisa dibuka lewat URL, dengan pemberitahuan.
  await page.goto("/pencapaian");
  await expect(page.getByText("Gamifikasi sedang dimatikan")).toBeVisible();

  // Diaktifkan kembali lewat database: menu muncul lagi tanpa perlu membersihkan cache.
  await setSetting("gamification", "on");
  await page.goto("/");
  await expect(api(page)).toBeVisible();
  await expect(nav.getByRole("link", { name: "Pencapaian" })).toBeVisible();
});
