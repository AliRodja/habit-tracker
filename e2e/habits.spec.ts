import { expect, test, type Page } from "@playwright/test";

async function addHabit(page: Page, name: string, extra: { target?: string } = {}) {
  const form = page.locator("form").first();
  await form.getByLabel("Nama", { exact: true }).fill(name);
  if (extra.target) await form.getByLabel("Target harian (opsional)").fill(extra.target);
  await form.getByRole("button", { name: "Tambah Habit" }).click();
}

const activeSection = (page: Page) => page.getByRole("region", { name: "Habit Aktif" });
const names = (page: Page) => activeSection(page).locator("li > div p.font-medium");

test.describe.configure({ mode: "serial" });

test("alur manajemen habit (FR-01 sampai FR-05)", async ({ page }) => {
  await page.goto("/habits");
  await expect(page.getByText("Belum ada habit aktif")).toBeVisible();

  // TC-02: nama kosong
  await page.locator("form").first().getByLabel("Nama", { exact: true }).fill("   ");
  await page.locator("form").first().getByRole("button", { name: "Tambah Habit" }).click();
  // `required` pada input menahan submit di browser; isian spasi lolos HTML tetapi ditolak server.
  await expect(page.getByText("Nama wajib diisi")).toBeVisible();

  // TC-01: tambah habit; urutan terakhir
  await addHabit(page, "Minum Air", { target: "8 gelas" });
  await expect(page.getByText("Habit ditambahkan.")).toBeVisible();
  await addHabit(page, "Membaca");
  await expect(names(page)).toHaveText(["Minum Air", "Membaca"]);
  await expect(page.getByText("Target: 8 gelas")).toBeVisible();

  // TC-04: nama duplikat (tidak peka huruf besar/kecil), isian lain tidak hilang
  const form = page.locator("form").first();
  await form.getByLabel("Target harian (opsional)").fill("jaga isian");
  await addHabit(page, "minum air");
  await expect(page.getByText("Nama sudah digunakan")).toBeVisible();
  await expect(form.getByLabel("Target harian (opsional)")).toHaveValue("jaga isian");
  await expect(form.getByLabel("Nama", { exact: true })).toHaveValue("minum air");

  // FR-05: urutkan
  await page.getByRole("button", { name: "Naikkan Membaca" }).click();
  await expect(names(page)).toHaveText(["Membaca", "Minum Air"]);

  // FR-02: ubah
  await activeSection(page).getByText("Ubah").first().click();
  const editForm = activeSection(page).locator("form").filter({ hasText: "Simpan perubahan" }).first();
  await editForm.getByLabel("Nama", { exact: true }).fill("Membaca Buku");
  await editForm.getByRole("button", { name: "Simpan perubahan" }).click();
  await expect(page.getByText("Perubahan disimpan.")).toBeVisible();
  await expect(names(page)).toHaveText(["Membaca Buku", "Minum Air"]);

  // TC-03: batas 5 habit
  for (const name of ["Olahraga", "Menulis Jurnal", "Tidur Teratur"]) await addHabit(page, name);
  await expect(names(page)).toHaveCount(5);
  await expect(page.getByText("Batas habit aktif tercapai")).toBeVisible();
  await expect(page.locator("form").first().getByRole("button", { name: "Tambah Habit" })).toBeDisabled();

  // FR-03: nonaktifkan -> masuk Arsip
  await activeSection(page).locator("li", { hasText: "Olahraga" }).getByRole("button", { name: "Nonaktifkan" }).click();
  await expect(names(page)).toHaveCount(4);
  const archive = page.getByRole("region", { name: "Arsip" });
  await expect(archive.locator("li > div p.font-medium")).toHaveText(["Olahraga"]);

  // Aktifkan kembali dinonaktifkan saat 5 habit aktif
  await addHabit(page, "Meditasi");
  await expect(archive.getByRole("button", { name: "Aktifkan kembali" })).toBeDisabled();
  await activeSection(page).locator("li", { hasText: "Meditasi" }).getByRole("button", { name: "Nonaktifkan" }).click();
  await archive.locator("li", { hasText: "Olahraga" }).getByRole("button", { name: "Aktifkan kembali" }).click();
  await expect(names(page)).toHaveText(["Membaca Buku", "Minum Air", "Menulis Jurnal", "Tidur Teratur", "Olahraga"]);

  // FR-04: hapus permanen dengan konfirmasi nama
  await archive.locator("li", { hasText: "Meditasi" }).getByRole("button", { name: "Hapus permanen" }).click();
  const dialog = page.getByRole("dialog");
  const confirm = dialog.getByRole("button", { name: "Hapus permanen" });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel(/Ketik/).fill("meditasi");
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel(/Ketik/).fill("Meditasi");
  await confirm.click();
  await expect(page.getByText("Tidak ada habit di arsip.")).toBeVisible();
});
