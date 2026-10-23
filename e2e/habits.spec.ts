import { expect, test, type Page } from "@playwright/test";
import { resetEmpty } from "./db";

test.describe.configure({ mode: "serial" });
test.beforeEach(resetEmpty);

const activeNames = (page: Page) => page.locator('section[aria-labelledby="active-title"] li p.font-semibold');
const archivedNames = (page: Page) => page.locator('section[aria-labelledby="archive-title"] li p.font-semibold');
const dialog = (page: Page) => page.getByRole("dialog");

async function openAdd(page: Page) {
  await page.getByRole("button", { name: "Tambah habit" }).first().click();
  await expect(dialog(page).getByRole("heading", { name: "Tambah habit" })).toBeVisible();
}

async function addHabit(page: Page, name: string, target?: string) {
  await openAdd(page);
  await dialog(page).getByLabel("Nama", { exact: true }).fill(name);
  if (target) await dialog(page).getByLabel("Target harian (opsional)").fill(target);
  await dialog(page).getByRole("button", { name: "Simpan habit" }).click();
  await expect(dialog(page)).toHaveCount(0);
}

test("alur manajemen habit (FR-01 sampai FR-05)", async ({ page }) => {
  await page.goto("/habits");
  await expect(page.getByText("Belum ada habit aktif")).toBeVisible();

  // TC-02: nama hanya spasi lolos `required` di browser tetapi ditolak server; dialog tetap terbuka
  await openAdd(page);
  await dialog(page).getByLabel("Nama", { exact: true }).fill("   ");
  await dialog(page).getByRole("button", { name: "Simpan habit" }).click();
  await expect(dialog(page).getByText("Nama wajib diisi")).toBeVisible();
  await dialog(page).getByRole("button", { name: "Batal" }).click();
  await expect(dialog(page)).toHaveCount(0);

  // TC-01: habit baru ditempatkan di urutan terakhir
  await addHabit(page, "Minum Air", "8 gelas");
  await addHabit(page, "Membaca");
  await expect(activeNames(page)).toHaveText(["Minum Air", "Membaca"]);
  await expect(page.getByText(/Target: 8 gelas/)).toBeVisible();

  // TC-04: nama duplikat (tidak peka huruf besar/kecil); isian lain tidak hilang
  await openAdd(page);
  await dialog(page).getByLabel("Nama", { exact: true }).fill("minum air");
  await dialog(page).getByLabel("Target harian (opsional)").fill("jaga isian");
  await dialog(page).getByRole("button", { name: "Simpan habit" }).click();
  await expect(dialog(page).getByText("Nama sudah digunakan")).toBeVisible();
  await expect(dialog(page).getByLabel("Target harian (opsional)")).toHaveValue("jaga isian");
  await expect(dialog(page).getByLabel("Nama", { exact: true })).toHaveValue("minum air");
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toHaveCount(0);

  // FR-05: urutkan
  await page.getByRole("button", { name: "Naikkan Membaca" }).click();
  await expect(activeNames(page)).toHaveText(["Membaca", "Minum Air"]);

  // FR-02: ubah lewat dialog
  await page.getByRole("button", { name: "Ubah Membaca" }).click();
  await expect(dialog(page).getByRole("heading", { name: "Ubah “Membaca”" })).toBeVisible();
  await dialog(page).getByLabel("Nama", { exact: true }).fill("Membaca Buku");
  await dialog(page).getByRole("button", { name: "Simpan perubahan" }).click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(activeNames(page)).toHaveText(["Membaca Buku", "Minum Air"]);

  // TC-03: batas 5 habit aktif — tombol tambah hilang dan alasannya ditampilkan
  for (const name of ["Olahraga", "Menulis Jurnal", "Tidur Teratur"]) await addHabit(page, name);
  await expect(activeNames(page)).toHaveCount(5);
  await expect(page.getByText(/Semua 5 slot sedang terpakai/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Tambah habit" })).toHaveCount(0);

  // FR-03: arsipkan → pindah ke Arsip, slot kembali tersedia
  await page.getByRole("button", { name: "Arsipkan Olahraga" }).click();
  await expect(activeNames(page)).toHaveCount(4);
  await expect(archivedNames(page)).toHaveText(["Olahraga"]);
  await expect(page.getByRole("button", { name: "Tambah habit" })).toBeVisible();

  // Aktifkan kembali dinonaktifkan saat 5 habit aktif
  await addHabit(page, "Meditasi");
  await expect(page.getByRole("button", { name: "Aktifkan kembali Olahraga" })).toBeDisabled();
  await page.getByRole("button", { name: "Arsipkan Meditasi" }).click();
  await page.getByRole("button", { name: "Aktifkan kembali Olahraga" }).click();
  await expect(activeNames(page)).toHaveText(["Membaca Buku", "Minum Air", "Menulis Jurnal", "Tidur Teratur", "Olahraga"]);

  // FR-04: hapus permanen dengan konfirmasi nama persis
  await page.getByRole("button", { name: "Hapus permanen Meditasi" }).click();
  const confirm = dialog(page).getByRole("button", { name: "Hapus permanen" });
  await expect(confirm).toBeDisabled();
  await dialog(page).getByLabel(/Ketik/).fill("meditasi");
  await expect(confirm).toBeDisabled();
  await dialog(page).getByLabel(/Ketik/).fill("Meditasi");
  await confirm.click();
  await expect(page.getByText("Tidak ada habit di arsip.")).toBeVisible();
});

test("tautan ?baru=1 dari halaman kosong langsung membuka dialog tambah", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Buat habit pertama" }).click();
  await expect(dialog(page).getByRole("heading", { name: "Tambah habit" })).toBeVisible();
});
