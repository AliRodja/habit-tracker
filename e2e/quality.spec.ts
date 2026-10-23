import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { addArchivedHabit, addNote, checkDates, resetSettings, resetWithTwoHabits, setSetting, setStartDate, shiftDate, today } from "./db";

test.describe.configure({ mode: "serial" });

const t = today();
const ROUTES = ["/", "/tracker", "/tracker?view=year", "/habits", "/reports/weekly", "/reports/monthly", "/reports/yearly", "/settings"];

test.beforeEach(async () => {
  await resetWithTwoHabits();
  await checkDates("Minum Air", [shiftDate(t, -3), shiftDate(t, -2), shiftDate(t, -1)]);
  await addNote("Minum Air", shiftDate(t, -4), "hujan deras");
  await addArchivedHabit("Meditasi Lama");
});
test.afterEach(resetSettings);

async function waitForContent(page: Page) {
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Memuat…")).toHaveCount(0);
}

for (const scheme of ["light", "dark"] as const) {
  test(`NFR-07: tanpa pelanggaran WCAG 2 AA pada seluruh halaman (${scheme})`, async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: scheme, baseURL: "http://127.0.0.1:3100" });
    const page = await context.newPage();
    const found: string[] = [];
    for (const route of ROUTES) {
      await page.goto(route);
      await waitForContent(page);
      const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      for (const v of violations) found.push(`${route}: ${v.id} (${v.impact}) ${v.nodes.length}× ${v.nodes[0].target.join(" ")} — ${v.nodes[0].failureSummary?.split("\n")[1] ?? v.help}`);
    }
    expect(found, `pelanggaran [${scheme}]`).toEqual([]);
    await context.close();
  });
}

test("NFR-07: tema gelap yang dipilih di Pengaturan pada OS terang juga lolos WCAG 2 AA", async ({ browser }) => {
  await setSetting("theme", "dark"); // jalur nyata: database → ThemeSync → data-theme
  const context = await browser.newContext({ colorScheme: "light", reducedMotion: "reduce", baseURL: "http://127.0.0.1:3100" });
  const page = await context.newPage();
  const found: string[] = [];
  for (const route of ROUTES) {
    await page.goto(route);
    await waitForContent(page);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    for (const v of violations) found.push(`${route}: ${v.id} ${v.nodes[0].target.join(" ")}`);
  }
  expect(found).toEqual([]);
  await context.close();
});

test("NFR-01: tidak ada request ke host eksternal pada seluruh halaman", async ({ page, baseURL }) => {
  const hosts = new Set<string>();
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.protocol === "http:" || url.protocol === "https:") hosts.add(url.host);
  });
  for (const route of ROUTES) {
    await page.goto(route);
    await waitForContent(page);
  }
  expect([...hosts]).toEqual([new URL(baseURL!).host]);
});

for (const [name, width, height] of [["desktop", 1280, 800], ["tablet", 768, 1024], ["ponsel", 390, 844]] as const) {
  test(`NFR-06: tidak ada scroll horizontal halaman pada lebar ${name} (${width}px)`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height }, baseURL: "http://127.0.0.1:3100" });
    const page = await context.newPage();
    for (const route of ROUTES) {
      await page.goto(route);
      await waitForContent(page);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${route} @${width}px`).toBeLessThanOrEqual(0);
      await expect(page.getByRole("navigation", { name: "Navigasi utama" })).toBeVisible();
    }
    await context.close();
  });
}

test("NFR-04: umpan balik centang < 100 ms meski server lambat (optimistic)", async ({ page }) => {
  await page.goto("/");
  await waitForContent(page);
  // Server Action sengaja ditahan 1,5 detik: UI tidak boleh ikut menunggu.
  await page.route("**/*", async (route) => {
    if (route.request().method() === "POST" && route.request().headers()["next-action"]) await new Promise((r) => setTimeout(r, 1500));
    await route.continue();
  });

  const elapsed = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const button = [...document.querySelectorAll<HTMLButtonElement>("button[aria-pressed]")].find((b) => b.textContent?.includes("Minum Air"))!;
        const start = performance.now();
        new MutationObserver((_records, observer) => {
          observer.disconnect();
          resolve(performance.now() - start);
        }).observe(button, { attributes: true, attributeFilter: ["aria-pressed"] });
        button.click();
      }),
  );
  test.info().annotations.push({ type: "waktu umpan balik", description: `${elapsed.toFixed(1)} ms` });
  expect(elapsed).toBeLessThan(100);
  await expect(page.getByRole("button", { name: /^Minum Air/ })).toHaveAttribute("aria-pressed", "true");
});

test("TC-13: 66 hari tercentang memberi lencana Terbentuk di dashboard (FR-13)", async ({ page }) => {
  await setStartDate("Minum Air", shiftDate(t, -100));
  // 63 hari (T-90..T-28) + 3 hari dari beforeEach (T-3..T-1) = 66 hari tercentang.
  await checkDates("Minum Air", Array.from({ length: 63 }, (_, i) => shiftDate(t, -90 + i)));

  await page.goto("/");
  const card = page.getByRole("listitem").filter({ hasText: "Minum Air" });
  await expect(card.getByText("66 / 66 hari")).toBeVisible(); // 63 + 3 hari dari beforeEach
  await expect(card.getByText("✓ Terbentuk")).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Membaca" }).getByText("✓ Terbentuk")).toHaveCount(0);
});

test("NFR-02: server hanya menerima koneksi dari 127.0.0.1, bukan dari alamat jaringan lokal", async ({ baseURL }) => {
  const { networkInterfaces } = await import("node:os");
  const lan = Object.values(networkInterfaces())
    .flat()
    .find((i) => i && i.family === "IPv4" && !i.internal)?.address;
  test.skip(!lan, "tidak ada antarmuka jaringan non-loopback pada mesin ini");

  const port = new URL(baseURL!).port;
  await expect(fetch(`http://${lan}:${port}/`, { signal: AbortSignal.timeout(3000) })).rejects.toThrow();
  expect((await fetch(baseURL!)).status).toBe(200); // loopback tetap berfungsi
});

test("NFR-04: penyimpanan centang ke database < 300 ms", async ({ page }) => {
  await page.goto("/");
  await waitForContent(page);
  const button = page.getByRole("button", { name: /^Minum Air/ });

  const durations: number[] = [];
  for (let i = 0; i < 4; i++) {
    const response = page.waitForResponse((r) => r.request().method() === "POST" && Boolean(r.request().headers()["next-action"]));
    const started = Date.now();
    await button.click();
    await response;
    durations.push(Date.now() - started);
  }
  // Panggilan pertama mencakup kompilasi sekali di dev server; yang dinilai adalah kondisi hangat.
  const warm = durations.slice(1);
  test.info().annotations.push({ type: "waktu simpan (hangat)", description: warm.map((d) => `${d} ms`).join(", ") });
  expect(Math.max(...warm)).toBeLessThan(300);
});
