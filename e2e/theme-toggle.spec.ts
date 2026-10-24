import { expect, test } from "@playwright/test";
import { resetSettings, resetWithTwoHabits } from "./db";

test.describe.configure({ mode: "serial" });
test.beforeEach(resetWithTwoHabits);
test.afterEach(resetSettings);

const html = (page: import("@playwright/test").Page) => page.locator("html");

test("desktop: tombol di sidebar mengganti tema seketika dan pilihan bertahan setelah muat ulang", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: "light", baseURL });
  const page = await context.newPage();
  await page.goto("/");

  const toDark = page.getByRole("button", { name: "Ganti ke mode gelap" });
  await expect(toDark).toBeVisible();
  await expect(toDark).toHaveText("Mode gelap");
  await toDark.click();
  await expect(html(page)).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(12, 10, 9)");

  const toLight = page.getByRole("button", { name: "Ganti ke mode terang" });
  await expect(toLight).toBeVisible();

  // Tersimpan ke database: tetap gelap di konteks browser baru (tanpa cache localStorage) dan di Pengaturan.
  await expect(async () => {
    const fresh = await browser.newContext({ colorScheme: "light", baseURL });
    const other = await fresh.newPage();
    await other.goto("/settings");
    await expect(html(other)).toHaveAttribute("data-theme", "dark", { timeout: 2000 });
    await expect(other.getByLabel("Gelap", { exact: true })).toBeChecked();
    await fresh.close();
  }).toPass({ timeout: 10_000 });

  await toLight.click();
  await expect(html(page)).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(html(page)).toHaveAttribute("data-theme", "light");
  await context.close();
});

test("ponsel: tombol ikon di header", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "light", baseURL });
  const page = await context.newPage();
  await page.goto("/");
  const toDark = page.getByRole("button", { name: "Ganti ke mode gelap" });
  await expect(toDark).toHaveCount(1); // varian baris desktop tersembunyi
  await toDark.click();
  await expect(html(page)).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("button", { name: "Ganti ke mode terang" })).toBeVisible();
  await context.close();
});

test("tema 'ikuti sistem' dengan OS gelap: tombol menawarkan mode terang", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: "dark", baseURL });
  const page = await context.newPage();
  await page.goto("/");
  await expect(html(page)).not.toHaveAttribute("data-theme", /.+/);
  await page.getByRole("button", { name: "Ganti ke mode terang" }).click();
  await expect(html(page)).toHaveAttribute("data-theme", "light");
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(247, 247, 245)");
  await context.close();
});
