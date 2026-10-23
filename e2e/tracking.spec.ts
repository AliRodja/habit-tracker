import { expect, test, type Page } from "@playwright/test";
import { formatDayLong } from "../lib/format";
import { recordFor, resetWithTwoHabits, shiftDate, today } from "./db";

test.describe.configure({ mode: "serial" });
test.beforeEach(resetWithTwoHabits);

const monthUrl = (date: string) => `/tracker?view=month&m=${date.slice(0, 7)}`;
const cell = (page: Page, habit: string, date: string) =>
  page.getByRole("button", { name: new RegExp(`^${habit}, ${formatDayLong(date)}:`) });

test("dashboard: check-in instan dengan progres, streak, dan tonggak (FR-06, TC-05)", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("0 dari 2 selesai")).toBeVisible();

  const water = page.getByRole("button", { name: /^Minum Air/ });
  await water.click();
  await expect(water).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("1 dari 2 selesai")).toBeVisible();
  await expect(page.getByText("50%", { exact: true })).toBeVisible();
  const waterCard = page.getByRole("listitem").filter({ hasText: "Minum Air" });
  await expect(waterCard.getByText("1 / 66 hari")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: /^Minum Air/ })).toHaveAttribute("aria-pressed", "true");
  expect(await recordFor("Minum Air", today())).toMatchObject({ completed: true });

  await page.getByRole("button", { name: /^Minum Air/ }).click();
  await expect(page.getByText("0 dari 2 selesai")).toBeVisible();
  await expect(waterCard.getByText("0 / 66 hari")).toBeVisible();
});

test("dashboard: kegagalan menyimpan mengembalikan status dan menampilkan galat (FR-11)", async ({ page }) => {
  await page.goto("/");
  await page.route("**/*", (route) =>
    route.request().method() === "POST" && route.request().headers()["next-action"] ? route.abort() : route.continue(),
  );

  const water = page.getByRole("button", { name: /^Minum Air/ });
  await water.click();
  await expect(page.getByRole("alert").filter({ hasText: "Gagal menyimpan" })).toBeVisible();
  await expect(water).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByText("0 dari 2 selesai")).toBeVisible();
  expect(await recordFor("Minum Air", today())).toBeNull();
});

test("grid: backfill tanggal lalu, progres harian, dan persistensi (FR-07, FR-08, FR-09, TC-06)", async ({ page }) => {
  const day = shiftDate(today(), -3);
  await page.goto(monthUrl(day));

  await cell(page, "Minum Air", day).click();
  await expect(cell(page, "Minum Air", day)).toHaveAttribute("aria-pressed", "true");
  // "Membaca" mulai hari ini, jadi hanya 1 habit eligible pada tanggal itu → 100%
  await expect(page.getByRole("row").filter({ has: cell(page, "Minum Air", day) }).getByRole("cell").last()).toHaveText("100%");

  await page.reload();
  await expect(cell(page, "Minum Air", day)).toHaveAttribute("aria-pressed", "true");
  expect(await recordFor("Minum Air", day)).toMatchObject({ completed: true });

  await cell(page, "Minum Air", day).click();
  await expect(cell(page, "Minum Air", day)).toHaveAttribute("aria-pressed", "false");
});

test("grid: sel di luar rentang habit dan masa depan nonaktif (FR-07.3, TC-07)", async ({ page }) => {
  const beforeStart = shiftDate(today(), -1); // "Membaca" mulai hari ini
  await page.goto(monthUrl(beforeStart));
  const outside = cell(page, "Membaca", beforeStart);
  await expect(outside).toHaveAttribute("aria-disabled", "true");
  await outside.click({ force: true }); // aria-disabled dianggap nonaktif oleh Playwright
  await expect(outside).not.toHaveAttribute("aria-pressed", "true");
  expect(await recordFor("Membaca", beforeStart)).toBeNull();

  const tomorrow = shiftDate(today(), 1);
  test.skip(tomorrow.slice(0, 7) !== today().slice(0, 7), "besok berada di bulan berikutnya");
  await page.goto(monthUrl(tomorrow));
  const future = cell(page, "Minum Air", tomorrow);
  await expect(future).toHaveAttribute("aria-disabled", "true");
  await future.click({ force: true });
  expect(await recordFor("Minum Air", tomorrow)).toBeNull();
});

test("grid: baris Hari Ini disorot dan progres 100% saat semua tercentang", async ({ page }) => {
  await page.goto(monthUrl(today()));
  await cell(page, "Minum Air", today()).click();
  await cell(page, "Membaca", today()).click();
  const row = page.getByRole("row").filter({ hasText: "Hari ini" });
  await expect(row).toHaveCount(1);
  await expect(row.getByRole("cell").last()).toHaveText("100%");
});

test("grid: navigasi keyboard dengan panah dan Spasi (TC-20)", async ({ page }) => {
  const t = today();
  await page.goto(monthUrl(t));
  await cell(page, "Minum Air", t).focus();

  await page.keyboard.press("ArrowRight");
  await expect(cell(page, "Membaca", t)).toBeFocused();
  await page.keyboard.press("Space");
  await expect(cell(page, "Membaca", t)).toHaveAttribute("aria-pressed", "true");

  await page.keyboard.press("ArrowLeft");
  await expect(cell(page, "Minum Air", t)).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(cell(page, "Minum Air", t)).toHaveAttribute("aria-pressed", "true");

  const yesterday = shiftDate(t, -1);
  test.skip(yesterday.slice(0, 7) !== t.slice(0, 7), "kemarin berada di bulan sebelumnya");
  await page.keyboard.press("ArrowUp");
  await expect(cell(page, "Minum Air", yesterday)).toBeFocused();
  await page.keyboard.press("End");
  await expect(cell(page, "Membaca", yesterday)).toBeFocused();
  await page.keyboard.press("Home");
  await expect(cell(page, "Minum Air", yesterday)).toBeFocused();
});

test("grid: catatan lewat klik kanan dan tombol N (FR-10)", async ({ page }) => {
  const t = today();
  await page.goto(monthUrl(t));

  await cell(page, "Minum Air", t).click({ button: "right" });
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Catatan: Minum Air" })).toBeVisible();
  await dialog.getByLabel("Catatan").fill("minum 3 gelas saja");
  await dialog.getByRole("button", { name: "Simpan" }).click();
  await expect(dialog).toBeHidden();

  await expect(cell(page, "Minum Air", t)).toHaveAccessibleName(/ada catatan/);
  expect(await recordFor("Minum Air", t)).toMatchObject({ completed: false, note: "minum 3 gelas saja" });

  await cell(page, "Minum Air", t).focus();
  await page.keyboard.press("n");
  await expect(dialog.getByLabel("Catatan")).toHaveValue("minum 3 gelas saja");
  await dialog.getByLabel("Catatan").fill("");
  await dialog.getByRole("button", { name: "Simpan" }).click();
  await expect(dialog).toBeHidden();
  await expect(cell(page, "Minum Air", t)).not.toHaveAccessibleName(/ada catatan/);
  expect(await recordFor("Minum Air", t)).toBeNull();
});

test("grid: tampilan tahunan memuat 12 bulan dan sel tetap dapat diklik (FR-07.2)", async ({ page }) => {
  const t = today();
  await page.goto(`/tracker?view=year&y=${t.slice(0, 4)}`);
  await expect(page.getByRole("table")).toHaveCount(12);

  await cell(page, "Minum Air", t).click();
  await expect(cell(page, "Minum Air", t)).toHaveAttribute("aria-pressed", "true");
  expect(await recordFor("Minum Air", t)).toMatchObject({ completed: true });
});

test("grid: navigasi bulan sebelumnya/berikutnya dan pemilih tahun", async ({ page }) => {
  await page.goto("/tracker");
  const heading = page.locator("p[aria-live=polite]");
  const before = await heading.textContent();
  await page.getByRole("link", { name: "Bulan sebelumnya" }).click();
  await expect(heading).not.toHaveText(before ?? "");
  await page.getByRole("link", { name: "Bulan berikutnya" }).click();
  await expect(heading).toHaveText(before ?? "");
  await expect(page.getByLabel("Tahun")).toHaveValue(today().slice(0, 4));
});
