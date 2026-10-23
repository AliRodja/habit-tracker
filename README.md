# Daily Habit Tracker

Aplikasi web *local-first* untuk melacak kebiasaan harian (bawaan 5 habit aktif, dapat diatur hingga 10). Seluruh data tersimpan di satu file SQLite di komputer Anda: tanpa akun, tanpa cloud, tanpa telemetri. Laporan harian, mingguan, bulanan, dan tahunan dihitung otomatis.

Landasan konseptualnya studi Lally dkk. (2010): kebiasaan rata-rata terbentuk setelah sekitar 66 hari pengulangan, dan melewatkan satu hari tidak menggagalkan prosesnya. Spesifikasi lengkap ada di [prd.md](prd.md).

## Persyaratan

- Node.js 24 atau lebih baru
- npm

## Memulai

```bash
npm install                      # juga menjalankan `prisma generate`
cp .env.example .env             # opsional: ubah lokasi database (default: data/habits.db)
npm run db:deploy                # membuat database dan menerapkan migrasi
npm run db:seed                  # opsional: data contoh satu tahun
```

Jalankan untuk pemakaian sehari-hari (build produksi, hanya menerima koneksi dari `127.0.0.1`):

```bash
npm run build
npm start                        # http://127.0.0.1:3000
```

Atau mode pengembangan: `npm run dev`.

## Fitur

| Halaman | Fungsi |
|---|---|
| **Hari Ini** | Check-in satu klik, api harian, XP hari ini, streak, dan progres menuju 66 hari |
| **Tracker** | Grid bulanan dan tahunan bergaya spreadsheet, isi ulang tanggal lalu, catatan harian, navigasi keyboard |
| **Habit** | Tambah, ubah, urutkan, arsipkan, dan hapus permanen (batas habit aktif dapat diatur 1–10 di Pengaturan) |
| **Laporan** | Mingguan, bulanan, dan tahunan dengan grafik dan heatmap konsistensi |
| **Pencapaian** | Api harian (hari beruntun) dengan pelindung, XP dan level, tantangan mingguan, medali per habit, dan 20 lencana (dapat dimatikan di Pengaturan) |
| **Pengaturan** | Zona waktu, batas habit aktif, awal minggu, gamifikasi, tema, ekspor (JSON/CSV), impor, dan hapus semua data |

### Pintasan keyboard di Tracker

| Tombol | Aksi |
|---|---|
| Panah, `Home`, `End` | Pindah antar sel |
| `Spasi` / `Enter` | Centang atau batalkan |
| `N` atau tombol Menu (atau klik kanan) | Catatan harian |

## Data Anda

- **Lokasi:** file SQLite di `data/habits.db` (ditampilkan juga di halaman Pengaturan). Menyalin file ini sudah cukup sebagai cadangan manual.
- **Cadangan otomatis:** sebelum impor mode Ganti dan sebelum Hapus Semua Data, cadangan JSON dibuat di `data/backups/` (ubah dengan `BACKUP_DIR`). Cadangan itu dapat dipulihkan lewat Pengaturan, Impor, mode Ganti.
- **Ekspor:** JSON (cadangan lengkap), CSV format panjang (satu baris per catatan), dan CSV format lebar per tahun (gaya spreadsheet).
- **Impor:** JSON hasil ekspor (mode Gabung atau Ganti) dan CSV format panjang (hanya Gabung). Selalu ada pratinjau lebih dulu, dan satu galat membatalkan seluruh impor.

## Perintah

| Perintah | Fungsi |
|---|---|
| `npm run dev` / `build` / `start` | Pengembangan, build produksi, jalankan produksi (terikat ke `127.0.0.1`) |
| `npm test` | Unit test dan test layanan dengan database SQLite sungguhan (Vitest) |
| `npm run test:e2e` | Tes end-to-end di browser (Playwright), memakai database `data/e2e.db` dan folder build `.next-e2e` sendiri sehingga dapat berjalan bersamaan dengan `npm run dev` |
| `npm run typecheck` / `lint` | Pemeriksaan tipe dan gaya kode |
| `npm run db:migrate` | Membuat migrasi baru saat skema berubah (pengembangan) |
| `npm run db:deploy` | Menerapkan migrasi yang ada |
| `npm run db:seed` | **Menimpa** isi database dengan data contoh; jangan dijalankan pada data sungguhan |
| `npm run db:studio` | Menjelajah database di Prisma Studio |

Tes E2E pertama kali membutuhkan browser: `npx playwright install chromium`.

## Teknologi

Next.js 16 (App Router, Cache Components), React 19, TypeScript, Tailwind CSS 4, Prisma 7 + SQLite (`better-sqlite3`), Zod 4, date-fns 4, Recharts 3, PapaParse, Vitest, dan Playwright (+ axe-core untuk audit aksesibilitas).

## Struktur

```
app/            halaman (App Router) dan Route Handler /api/export, /api/import
components/     komponen UI per fitur (habits, tracker, reports, settings, layout)
lib/metrics/    perhitungan metrik berupa fungsi murni (eligibility, progres, streak, tonggak 66 hari)
lib/reports.ts  pembentuk laporan mingguan, bulanan, tahunan
lib/gamification.ts  api harian, pelindung, XP, level, dan pencapaian
lib/io/         skema, CSV, dan perencana impor
lib/services/   logika bisnis dan akses database
lib/actions/    Server Actions
prisma/         skema, migrasi, dan seed
tests/, e2e/    unit test dan tes end-to-end
```

## Keamanan

Server hanya mendengarkan `127.0.0.1`, dan Route Handler menolak `Host` selain localhost serta POST dari origin lain, sehingga situs web lain di browser Anda tidak dapat membaca atau menimpa data lewat localhost. Semua input divalidasi di server dengan Zod.
