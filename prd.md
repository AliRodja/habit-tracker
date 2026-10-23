# Product Requirement Document (PRD)
## Local Daily Habit Tracker Web Application

| Atribut | Nilai |
|---|---|
| Versi Dokumen | 2.1 (stack diperbarui ke versi terbaru per 23 Oktober 2026) |
| Status | Siap dikembangkan (MVP) |
| Tanggal | 23 Oktober 2026 |
| Penyusun | Ali Imran Rodja |
| Tipe Aplikasi | Web, *local-first*, pengguna tunggal |

---

## 1. Ringkasan Produk

Daily Habit Tracker adalah aplikasi web *local-first* untuk membantu pengguna membangun dan mempertahankan kebiasaan baru melalui pencatatan harian yang konsisten. Aplikasi ini memindahkan fungsi lembar kerja *spreadsheet* pelacak kebiasaan ke antarmuka web modern, dengan penyimpanan data lokal (SQLite) dan analitik visual yang dihitung otomatis.

Landasan konseptualnya adalah studi Phillippa Lally dkk. (University College London, 2010, *European Journal of Social Psychology*) yang menemukan bahwa perilaku mencapai tingkat otomatisitas setelah median **66 hari** pengulangan, dengan rentang antarindividu yang lebar (sekitar 18–254 hari). Studi yang sama menunjukkan bahwa sesekali melewatkan satu hari tidak menggagalkan proses pembentukan kebiasaan. Karena itu, aplikasi ini menjadikan angka 66 hari sebagai **tonggak motivasi**, bukan janji pasti, dan menekankan konsistensi jangka panjang alih-alih kesempurnaan.

### 1.1 Masalah yang Diselesaikan
1. Pelacakan kebiasaan di *spreadsheet* kurang nyaman diisi setiap hari dan rumus analitiknya mudah rusak.
2. Aplikasi pelacak kebiasaan komersial umumnya menyimpan data di *cloud* pihak ketiga.
3. Pengguna sulit melihat pola jangka panjang (bulanan, tahunan) dari catatan harian mentah.

### 1.2 Target Pengguna
Individu (pengguna tunggal) yang ingin membangun hingga 5 kebiasaan utama, nyaman menjalankan aplikasi di komputernya sendiri, dan mengutamakan privasi data.

---

## 2. Tujuan & Prinsip Utama

| Prinsip | Penjelasan | Implikasi Teknis |
|---|---|---|
| **Local-First** | Seluruh data berada di perangkat pengguna, tanpa server *cloud* eksternal. | SQLite sebagai file lokal; server Next.js hanya berjalan di `localhost`; tanpa telemetri atau CDN wajib saat runtime. |
| **Fokus Konsistensi** | Menghargai keberlanjutan, bukan skor sempurna. | Fitur *streak* yang toleran terhadap "hari ini belum diisi", tonggak 66 hari, dan bahasa UI yang tidak menghukum. |
| **Analitik Otomatis** | Laporan harian, mingguan, bulanan, dan tahunan tanpa rumus manual. | Seluruh metrik dihitung di server dari data mentah; definisi metrik baku (lihat Bagian 4). |
| **Sederhana & Cepat** | Mencentang kebiasaan harus terasa instan. | *Optimistic update*, satu klik per centang, navigasi keyboard. |

### 2.1 Indikator Keberhasilan Produk
1. Pengguna dapat mencatat seluruh kebiasaan hari ini dalam kurang dari 10 detik.
2. Seluruh laporan menampilkan angka yang konsisten satu sama lain (tidak ada perbedaan hasil antarhalaman untuk periode yang sama).
3. Data dapat diekspor lalu diimpor kembali tanpa kehilangan satu pun catatan (*round-trip* tanpa selisih).

### 2.2 Di Luar Cakupan (Out of Scope) MVP
1. Autentikasi dan multi-pengguna.
2. Sinkronisasi *cloud* atau antarperangkat.
3. Notifikasi/pengingat (*push*, email).
4. Aplikasi *mobile native*.
5. Kebiasaan kuantitatif (mis. menghitung 8 gelas secara numerik). Pada MVP, target harian adalah label teks dan penyelesaian bersifat ya/tidak. Dicatat sebagai rencana pengembangan (Bagian 12).

---

## 3. Glosarium & Aturan Dasar

Definisi berikut menjadi acuan tunggal untuk seluruh perhitungan.

| Istilah | Definisi |
|---|---|
| **Tanggal** | String `YYYY-MM-DD` dalam zona waktu pengguna (default `Asia/Jakarta`). Tidak menyimpan jam, sehingga bebas dari pergeseran zona waktu. |
| **Hari Ini** | Tanggal saat ini menurut zona waktu pada Pengaturan. |
| **Habit Aktif** | Habit dengan `isActive = true`. Maksimal **5** habit aktif sekaligus. |
| **Habit Eligible pada tanggal *d*** | Habit yang `startDate ≤ d`, dan (`archivedAt` kosong atau `d < archivedAt`), dan `d ≤ Hari Ini`. Hanya pasangan (habit, tanggal) yang eligible yang dihitung dalam penyebut persentase. |
| **Habit-Day** | Satu pasangan (habit, tanggal) yang eligible. Satuan dasar perhitungan persentase. |
| **Centang** | `HabitRecord` dengan `completed = true`. |
| **Hari Aktif** | Tanggal dengan minimal 1 centang. |
| **Hari Sempurna** | Tanggal dengan seluruh habit eligible tercentang (progres 100%) dan jumlah habit eligible > 0. |
| **Tanggal Masa Depan** | Tanggal setelah Hari Ini. Tidak dapat dicentang. |

**Catatan penting:** versi awal PRD menggunakan penyebut tetap `365 × 5`. Rumus itu keliru apabila pengguna memiliki kurang dari 5 habit, menambah habit di tengah tahun, menonaktifkan habit, tahun kabisat (366 hari), atau tahun berjalan yang belum selesai. Seluruh rumus pada dokumen ini menggunakan **Habit-Day eligible** sebagai penyebut.

---

## 4. Persyaratan Fungsional (Functional Requirements)

Setiap kebutuhan diberi kode untuk penelusuran ke pengujian (Bagian 10).

### 4.1 Manajemen Kebiasaan (Habit Setup)

**FR-01 — Tambah Habit**
Pengguna dapat membuat habit baru dengan atribut berikut.

| Atribut | Wajib | Validasi | Contoh |
|---|---|---|---|
| Nama | Ya | 1–50 karakter, unik di antara habit aktif (tidak peka huruf besar/kecil) | Minum Air |
| Target Harian | Tidak | Teks maks. 50 karakter | 8 gelas |
| Deskripsi | Tidak | Maks. 200 karakter | Minum air putih sepanjang hari |
| Warna | Ya (default) | Salah satu dari palet preset | Hijau |
| Tanggal Mulai | Ya (default Hari Ini) | Tidak boleh di masa depan | 2026-10-23 |

Kriteria penerimaan:
1. Tombol "Tambah Habit" dinonaktifkan dan menampilkan pesan apabila sudah ada 5 habit aktif.
2. Habit baru otomatis ditempatkan di urutan terakhir.
3. Validasi gagal menampilkan pesan galat di bawah kolom terkait tanpa menghapus isian lain.

**FR-02 — Ubah Habit**
Pengguna dapat mengubah seluruh atribut habit. Mengubah Tanggal Mulai ke tanggal yang lebih akhir tidak menghapus catatan lama, namun catatan sebelum tanggal mulai tidak dihitung dalam statistik.

**FR-03 — Nonaktifkan / Aktifkan Kembali Habit**
1. Menonaktifkan mengisi `archivedAt = Hari Ini` dan `isActive = false`. Seluruh riwayat tetap tersimpan dan tetap dihitung untuk periode sebelum tanggal arsip.
2. Mengaktifkan kembali hanya diizinkan bila jumlah habit aktif < 5; nilai `archivedAt` dikosongkan.
3. Habit nonaktif ditampilkan di bagian terpisah "Arsip" pada halaman Habit.

**FR-04 — Hapus Habit Permanen**
Hanya tersedia untuk habit nonaktif, dengan dialog konfirmasi yang meminta pengguna mengetik nama habit. Penghapusan ikut menghapus seluruh catatannya (*cascade*).

**FR-05 — Urutkan Habit**
Pengguna dapat mengubah urutan habit aktif (seret-lepas atau tombol naik/turun). Urutan disimpan pada `orderIndex` dan berlaku di seluruh tampilan.

### 4.2 Pencatatan Harian (Daily Tracking)

**FR-06 — Check-in Hari Ini (Dashboard)**
Halaman utama menampilkan kartu setiap habit aktif untuk Hari Ini, lengkap dengan nama, target, *streak* saat ini, dan tombol centang. Satu klik mengubah status selesai/belum.

**FR-07 — Grid Pelacakan (Tracking Grid)**
Tampilan matriks bergaya *spreadsheet*:
1. **Tampilan Bulanan (default):** baris = tanggal dalam bulan, kolom = habit aktif, ditambah kolom "Progres Harian". Navigasi bulan sebelumnya/berikutnya dan pemilih tahun.
2. **Tampilan Tahunan:** 12 bulan dalam satu halaman (365/366 hari) untuk peninjauan cepat. Sel tetap dapat diklik.
3. Sel tanggal masa depan dan sel di luar rentang eligible habit ditampilkan nonaktif (abu-abu).
4. Baris Hari Ini disorot.
5. Navigasi keyboard: tombol panah untuk berpindah sel, `Spasi`/`Enter` untuk mencentang.

**FR-08 — Perhitungan Progres Harian**

$$\text{Progres Harian}(d) = \frac{\text{Jumlah centang pada tanggal } d}{\text{Jumlah habit eligible pada tanggal } d}$$

Bila jumlah habit eligible = 0, progres ditampilkan sebagai "–" (bukan 0%) dan tanggal tersebut tidak dihitung dalam rata-rata apa pun.

**FR-09 — Pencatatan Fleksibel (Backfill)**
Pengguna dapat mencentang atau menghapus centang untuk Hari Ini maupun tanggal sebelumnya (dalam rentang eligible). Tanggal masa depan ditolak baik di UI maupun di server.

**FR-10 — Catatan Harian (Opsional)**
Setiap sel dapat diberi catatan singkat (maks. 200 karakter) melalui klik kanan atau tombol detail. Sel bercatatan menampilkan penanda kecil.

**FR-11 — Umpan Balik Instan**
Perubahan centang diterapkan secara *optimistic* di UI. Bila penyimpanan gagal, UI mengembalikan status semula dan menampilkan pesan galat.

### 4.3 Konsistensi & Motivasi

**FR-12 — Streak**
1. **Streak Saat Ini:** jumlah hari eligible berturut-turut yang tercentang, dihitung mundur dari Hari Ini. Bila Hari Ini belum dicentang, perhitungan dimulai dari kemarin (hari yang belum selesai tidak memutus *streak*).
2. **Streak Terpanjang:** rangkaian berturut-turut terpanjang sepanjang riwayat habit.

**FR-13 — Tonggak 66 Hari**
Setiap habit menampilkan indikator progres "X / 66 hari" berdasarkan **total hari tercentang sejak Tanggal Mulai** (bukan *streak*, karena sesuai temuan Lally melewatkan satu hari tidak membatalkan proses). Saat mencapai 66, habit diberi lencana "Terbentuk". Teks bantuan menjelaskan bahwa 66 hari adalah median penelitian dan waktu tiap orang dapat berbeda.

### 4.4 Mesin Laporan & Analitik (Reporting & Analytics)

Seluruh laporan menggunakan definisi pada Bagian 3. Rumus umum tingkat penyelesaian untuk periode *P*:

$$\text{Tingkat Penyelesaian}(P) = \frac{\sum_{d \in P} \text{Centang}(d)}{\sum_{d \in P} \text{Habit Eligible}(d)}$$

**FR-14 — Laporan Mingguan**
1. Pemilih periode: "7 hari terakhir" (bergulir, default) atau minggu kalender (Senin–Minggu, mengikuti Pengaturan).
2. Tingkat penyelesaian periode dan perbandingan dengan periode sebelumnya (naik/turun dalam poin persentase).
3. Grafik batang progres harian selama 7 hari.
4. **Hari Paling Produktif:** tanggal dengan progres harian tertinggi dalam periode; bila seri, ambil jumlah centang terbanyak, lalu tanggal paling awal.
5. Tabel per habit: jumlah centang dari jumlah hari eligible (mis. 5/7).

**FR-15 — Laporan Bulanan**
1. Grafik batang tingkat penyelesaian per bulan (Januari–Desember) untuk tahun terpilih. Bulan tanpa habit-day eligible ditampilkan kosong, bukan 0%.
2. Distribusi penyelesaian per habit pada bulan terpilih (grafik batang horizontal atau donat).
3. Ringkasan bulan: tingkat penyelesaian, jumlah Hari Sempurna, jumlah Hari Aktif, habit terbaik dan habit yang paling perlu perhatian.

**FR-16 — Laporan Tahunan**
1. **Total Centang** dan **Tingkat Penyelesaian Tahunan** (rumus umum dengan *P* = seluruh tanggal eligible dalam tahun terpilih; untuk tahun berjalan dihitung sampai Hari Ini).
2. **Total Hari Aktif** dan **Total Hari Sempurna** dari jumlah hari yang telah berlalu.
3. **Heatmap Konsistensi** bergaya kalender kontribusi (kolom = minggu, baris = hari Senin–Minggu). Tingkat warna berdasarkan progres harian:

| Level | Progres Harian |
|---|---|
| 0 | 0% atau tidak eligible (abu-abu terang) |
| 1 | > 0% – < 40% |
| 2 | 40% – < 70% |
| 3 | 70% – < 100% |
| 4 | 100% (Hari Sempurna) |

   *Tooltip* setiap sel menampilkan tanggal, jumlah centang, dan persentase.
4. **Pola Hari dalam Seminggu:** rata-rata progres harian per hari (Senin–Minggu) sepanjang tahun, untuk mengetahui hari yang paling dan paling tidak konsisten.
5. Tabel per habit: total centang, tingkat penyelesaian, *streak* terpanjang tahun itu.

### 4.5 Pengelolaan Data (Data Management)

**FR-17 — Penyimpanan Lokal**
Data disimpan pada satu file SQLite (default `./data/habits.db`) melalui Prisma ORM. Lokasi file ditampilkan di halaman Pengaturan agar pengguna dapat mencadangkannya secara manual.

**FR-18 — Ekspor Data**
1. **JSON (cadangan lengkap):** seluruh habit (termasuk arsip), catatan, dan pengaturan.
2. **CSV format panjang:** satu baris per catatan, cocok untuk analisis lanjutan.
3. **CSV format lebar (gaya spreadsheet):** satu baris per tanggal, satu kolom per habit (nilai `1`/`0`), untuk tahun terpilih.
4. Nama file: `habit-tracker-YYYYMMDD-HHmm.json` / `.csv`.

**FR-19 — Impor Data**
1. Mendukung file JSON hasil ekspor (FR-18.1) dan CSV format panjang (FR-18.2).
2. Alur: unggah file → validasi skema → **pratinjau** (jumlah habit dan catatan, galat per baris) → pilih mode → konfirmasi.
3. Mode **Gabung (Merge):** *upsert* berdasarkan `id` habit dan pasangan (`habitId`, `date`); data dari file menimpa data lokal yang bentrok.
4. Mode **Ganti (Replace):** menghapus seluruh data lalu memasukkan data file. Sistem **otomatis membuat cadangan JSON** sebelum penggantian.
5. Impor dijalankan dalam satu transaksi basis data; bila gagal, tidak ada data yang berubah.
6. Impor yang menghasilkan lebih dari 5 habit aktif ditolak dengan pesan yang menjelaskan cara menyesuaikannya.

**FR-20 — Pengaturan**
Zona waktu (default `Asia/Jakarta`), hari awal minggu (default Senin), tema (terang/gelap/sistem), serta zona bahaya "Hapus Semua Data" dengan konfirmasi ketik.

---

## 5. User Stories

| ID | Sebagai pengguna, saya ingin… | Agar… | FR |
|---|---|---|---|
| US-01 | membuat hingga 5 habit dengan target dan warna | daftar kebiasaan sesuai tujuan saya | FR-01 |
| US-02 | mencentang habit hari ini dari halaman utama | pencatatan cepat setiap hari | FR-06 |
| US-03 | mengisi centang hari kemarin yang terlupa | data tetap akurat | FR-09 |
| US-04 | melihat *streak* dan progres 66 hari | termotivasi untuk konsisten | FR-12, FR-13 |
| US-05 | melihat laporan mingguan, bulanan, dan tahunan | memahami pola perilaku saya | FR-14–16 |
| US-06 | menonaktifkan habit tanpa kehilangan riwayat | bisa mengganti fokus tanpa merusak statistik | FR-03 |
| US-07 | mengekspor dan mengimpor data | memiliki cadangan dan bisa pindah komputer | FR-18, FR-19 |

---

## 6. Persyaratan Non-Fungsional (Non-Functional Requirements)

| Kode | Kategori | Persyaratan | Cara Verifikasi |
|---|---|---|---|
| NFR-01 | Privasi | Seluruh data tersimpan di sistem berkas lokal. Tidak ada permintaan jaringan ke host eksternal saat aplikasi berjalan (font di-*bundle* lokal, tanpa analitik). | Periksa tab Network di DevTools. |
| NFR-02 | Keamanan | Server hanya mendengarkan `127.0.0.1` sehingga tidak dapat diakses dari perangkat lain di jaringan. Seluruh input divalidasi di server (Zod). | Coba akses dari perangkat lain; uji input tidak valid. |
| NFR-03 | Kinerja Muat | Halaman utama dan grid bulanan dimuat < 1 detik pada build produksi di `localhost`. | Lighthouse / pengukuran manual. |
| NFR-04 | Kinerja Interaksi | Umpan balik visual centang < 100 ms (*optimistic*); penyimpanan ke DB < 300 ms. | Pengukuran DevTools Performance. |
| NFR-05 | Kinerja Laporan | Laporan tahunan untuk 5 habit × 366 hari dihitung < 300 ms. | Uji dengan data *seed* setahun penuh. |
| NFR-06 | Responsif | Tampilan optimal pada Desktop (≥ 1024 px) dan Tablet (≥ 768 px). Ponsel tetap dapat digunakan (grid dapat di-*scroll* horizontal). | Uji pada tiga lebar layar. |
| NFR-07 | Aksesibilitas | Seluruh centang dapat dioperasikan dengan keyboard, memiliki label aksesibel, kontras warna memenuhi WCAG AA, dan informasi tidak hanya disampaikan lewat warna. | Navigasi keyboard; pemeriksa kontras. |
| NFR-08 | Integritas Data | Satu catatan per (habit, tanggal) dijamin oleh *unique constraint*; impor bersifat transaksional. | Uji duplikasi dan impor gagal. |
| NFR-09 | Keterpeliharaan | TypeScript *strict mode*; logika perhitungan metrik berada di modul murni (`lib/metrics`) yang memiliki *unit test*. | Peninjauan kode, `npm test`. |

---

## 7. Arsitektur & Tech Stack

### 7.1 Tech Stack

| Lapisan | Teknologi | Peran |
|---|---|---|
| Framework | Next.js 16 (App Router, Cache Components, Turbopack) + React 19 | UI, *Server Components*, *Server Actions*, *Route Handlers* |
| Bahasa | TypeScript 6.0 (*strict*) | Versi tertinggi yang didukung `typescript-eslint` 8.x (TypeScript 7 belum didukung linter) |
| Styling | Tailwind CSS 4 | Desain responsif dan tema gelap |
| Ikon | lucide-react | Ikon navigasi dan aksi |
| Komponen UI | Komponen sendiri berbasis Tailwind (shadcn/ui opsional, ditambahkan bila diperlukan) | Dialog, tombol, form, *tooltip* |
| Basis Data | SQLite | Penyimpanan lokal berbasis file |
| ORM | Prisma 7 (generator `prisma-client`, `prisma.config.ts`) + `@prisma/adapter-better-sqlite3` | Skema, migrasi, *query* bertipe. Prisma 7 mewajibkan *driver adapter*. Prisma 8 masih *release candidate*, sehingga belum dipakai |
| Validasi | Zod 4 | Validasi form, Server Action, dan file impor |
| Tanggal | date-fns 4 + `@date-fns/tz` | Operasi tanggal dan zona waktu (menggantikan `date-fns-tz`) |
| Grafik | Recharts 3 | Grafik batang dan donat |
| Heatmap | Komponen kustom (CSS Grid/SVG) | Heatmap tahunan |
| CSV | Papa Parse 5 | *Parsing* dan pembuatan CSV |
| Pengujian | Vitest 5 (unit) + Playwright (E2E, opsional) | Pengujian metrik dan alur utama |
| Runtime | Node.js 24 LTS | Menyediakan `process.loadEnvFile` sehingga tidak perlu paket `dotenv` |

### 7.2 Arsitektur Tingkat Tinggi

```
Browser (localhost:3000)
   │  Server Components (render data awal)
   │  Server Actions   (mutasi: habit, centang, pengaturan)
   │  Route Handlers   (ekspor/impor file)
   ▼
Next.js Server (berjalan di 127.0.0.1)
   │  lib/services  → logika bisnis & validasi Zod
   │  lib/metrics   → fungsi murni perhitungan laporan
   ▼
Prisma Client ──► SQLite (./data/habits.db)
```

Aplikasi dijalankan dengan `npm run build` lalu `npm start` (skrip menjalankan `next start -H 127.0.0.1`; `npm run dev` juga terikat ke `127.0.0.1`).

Next.js 16 dikonfigurasi dengan **Cache Components**. Konsekuensinya, nilai yang bergantung pada waktu request ("Hari Ini") dan data DB harus dibaca di dalam `<Suspense>` dan setelah `await connection()` (dibungkus di `getToday()` pada `lib/services/settings-service.ts`). Dengan begitu cangkang halaman dirender statis sedangkan data di-*stream*. Perhitungan laporan dilakukan di server dengan mengambil catatan dalam rentang tanggal sekali *query*, kemudian diolah oleh fungsi murni di `lib/metrics` sehingga mudah diuji.

### 7.3 Struktur Folder

```
habit-tracker/
├── app/
│   ├── page.tsx                  # Dashboard (check-in hari ini)
│   ├── tracker/page.tsx          # Grid bulanan/tahunan
│   ├── habits/page.tsx           # Kelola habit + arsip
│   ├── reports/
│   │   ├── weekly/page.tsx
│   │   ├── monthly/page.tsx
│   │   └── yearly/page.tsx
│   ├── settings/page.tsx         # Pengaturan, ekspor/impor, zona bahaya
│   ├── api/
│   │   ├── export/route.ts       # GET ?format=json|csv-long|csv-wide&year=
│   │   └── import/route.ts       # POST (multipart) ?mode=merge|replace&dryRun=
│   └── layout.tsx
├── components/
│   ├── tracker/                  # TrackingGrid, GridCell, DayProgress
│   ├── reports/                  # Heatmap, charts, StatCard
│   └── habits/                   # HabitForm, HabitCard, StreakBadge
├── lib/
│   ├── db.ts                     # Prisma client singleton (+ adapter better-sqlite3)
│   ├── constants.ts              # batas habit, palet warna, nilai default pengaturan
│   ├── dates.ts                  # util tanggal & zona waktu
│   ├── generated/prisma/         # hasil `prisma generate` (di-.gitignore)
│   ├── metrics/                  # eligibility, progress, streak, reports
│   ├── services/                 # habitService, recordService, ioService
│   ├── actions/                  # Server Actions
│   └── validation/               # skema Zod
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts                   # data contoh 1 tahun untuk uji
├── prisma.config.ts              # lokasi skema, migrasi, seed, dan DATABASE_URL (Prisma 7)
├── vitest.config.mts
├── .env.example                  # contoh DATABASE_URL
├── data/                         # habits.db (masuk .gitignore)
└── tests/
```

---

## 8. Skema Basis Data (Database Schema)

Perubahan dibanding versi awal: atribut **Target Harian** dan **Status Aktif** yang disebut pada kebutuhan kini memiliki kolom; tanggal disimpan sebagai string `YYYY-MM-DD` untuk menghindari bug zona waktu (SQLite tidak memiliki tipe tanggal murni, dan `DateTime` akan menyimpan jam UTC sehingga tanggal dapat bergeser satu hari di WIB); ditambahkan `startDate`, `archivedAt`, `color`, `note`, indeks, serta tabel `Setting`.

```prisma
// Prisma 7: URL basis data tidak lagi ditulis di schema.prisma, melainkan di prisma.config.ts
// (DATABASE_URL="file:./data/habits.db"), dan koneksi runtime memakai driver adapter (lib/db.ts).
datasource db {
  provider = "sqlite"
}

generator client {
  provider = "prisma-client"
  output   = "../lib/generated/prisma"
}

model Habit {
  id          String        @id @default(uuid())
  name        String
  description String?
  target      String?       // label target harian, mis. "8 gelas"
  color       String        @default("emerald")
  orderIndex  Int
  isActive    Boolean       @default(true)
  startDate   String        // "YYYY-MM-DD"
  archivedAt  String?       // "YYYY-MM-DD", diisi saat dinonaktifkan
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  records     HabitRecord[]

  @@index([isActive, orderIndex])
}

model HabitRecord {
  id        String   @id @default(uuid())
  habitId   String
  date      String   // "YYYY-MM-DD" menurut zona waktu pengguna
  completed Boolean  @default(true)
  note      String?
  updatedAt DateTime @updatedAt
  habit     Habit    @relation(fields: [habitId], references: [id], onDelete: Cascade)

  @@unique([habitId, date])
  @@index([date])
}

model Setting {
  key   String @id   // "timezone" | "weekStartsOn" | "theme"
  value String
}
```

Aturan data:
1. Mencentang melakukan *upsert* `completed = true`; menghapus centang mengubah menjadi `completed = false` (catatan `note` tetap tersimpan). Seluruh perhitungan hanya menghitung `completed = true`.
2. Batas 5 habit aktif ditegakkan di lapisan *service* (SQLite tidak mendukung *constraint* bersyarat semacam ini secara sederhana).
3. Volume maksimum per tahun sekitar 5 × 366 = 1.830 catatan, sehingga seluruh *query* laporan tahunan cukup satu kali pengambilan berdasarkan rentang `date`.

---

## 9. Kontrak Antarmuka (Server Actions & Route Handlers)

### 9.1 Server Actions

| Action | Input | Keluaran / Aturan |
|---|---|---|
| `createHabit` | name, target?, description?, color, startDate | Gagal bila sudah 5 habit aktif atau nama duplikat |
| `updateHabit` | id, field yang diubah | Validasi sama dengan create |
| `archiveHabit` | id | Mengisi `archivedAt = Hari Ini`, `isActive = false` |
| `restoreHabit` | id | Gagal bila habit aktif sudah 5 |
| `deleteHabit` | id, confirmName | Hanya untuk habit nonaktif; `confirmName` harus sama |
| `reorderHabits` | daftar id terurut | Memperbarui `orderIndex` dalam satu transaksi |
| `setRecord` | habitId, date, completed | Tolak tanggal masa depan atau di luar rentang eligible |
| `setRecordNote` | habitId, date, note | Maks. 200 karakter |
| `updateSettings` | timezone?, weekStartsOn?, theme? | Validasi nilai yang diizinkan |
| `resetAllData` | confirmText = "HAPUS" | Membuat cadangan otomatis sebelum menghapus |

### 9.2 Route Handlers

| Endpoint | Metode | Keterangan |
|---|---|---|
| `/api/export?format=json` | GET | Cadangan lengkap (JSON) |
| `/api/export?format=csv-long` | GET | CSV satu baris per catatan |
| `/api/export?format=csv-wide&year=2026` | GET | CSV gaya spreadsheet per tahun |
| `/api/import?mode=merge\|replace&dryRun=true` | POST | `dryRun=true` mengembalikan pratinjau tanpa menyimpan |

### 9.3 Format Ekspor

**JSON**
```json
{
  "app": "daily-habit-tracker",
  "schemaVersion": 1,
  "exportedAt": "2026-10-23T22:30:00+07:00",
  "settings": { "timezone": "Asia/Jakarta", "weekStartsOn": "1", "theme": "system" },
  "habits": [
    {
      "id": "uuid", "name": "Minum Air", "description": null, "target": "8 gelas",
      "color": "emerald", "orderIndex": 0, "isActive": true,
      "startDate": "2026-01-01", "archivedAt": null
    }
  ],
  "records": [
    { "habitId": "uuid", "date": "2026-10-23", "completed": true, "note": null }
  ]
}
```

**CSV format panjang**
```
date,habit_id,habit_name,completed,note
2026-10-23,uuid,Minum Air,1,
```

**CSV format lebar**
```
date,Minum Air,Olahraga,Membaca,Menulis Jurnal,Tidur Teratur,progress
2026-10-23,1,0,1,1,0,0.60
```

---

## 10. Rencana Pengujian (Black Box Testing)

| ID | Skenario | Langkah | Hasil yang Diharapkan | FR |
|---|---|---|---|---|
| TC-01 | Tambah habit valid | Isi nama "Membaca", simpan | Habit muncul di urutan terakhir | FR-01 |
| TC-02 | Nama kosong | Simpan tanpa nama | Pesan "Nama wajib diisi", data tidak tersimpan | FR-01 |
| TC-03 | Batas 5 habit | Tambah habit ke-6 | Tombol nonaktif / pesan batas tercapai | FR-01 |
| TC-04 | Nama duplikat | Tambah "minum air" saat "Minum Air" aktif | Pesan nama sudah digunakan | FR-01 |
| TC-05 | Centang hari ini | Klik centang di dashboard | Status berubah instan, progres harian diperbarui | FR-06, FR-08 |
| TC-06 | Centang tanggal lalu | Centang tanggal 3 hari lalu di grid | Tersimpan, laporan ikut berubah | FR-09 |
| TC-07 | Centang masa depan | Klik sel besok | Sel nonaktif; permintaan langsung ke server ditolak | FR-09 |
| TC-08 | Progres harian | 3 dari 5 habit dicentang | Progres harian 60% | FR-08 |
| TC-09 | Habit baru di tengah bulan | Habit mulai tgl 15 | Tgl 1–14 tidak dihitung dalam penyebut | Bagian 3 |
| TC-10 | Arsip habit | Nonaktifkan habit | Hilang dari grid aktif, riwayat tetap ada di laporan periode lama | FR-03 |
| TC-11 | Streak dengan hari ini belum diisi | Centang 5 hari sampai kemarin | *Streak* saat ini = 5 | FR-12 |
| TC-12 | Streak terputus | Lewati satu hari | *Streak* saat ini direset, terpanjang tetap | FR-12 |
| TC-13 | Tonggak 66 | Data *seed* 66 centang | Lencana "Terbentuk" tampil | FR-13 |
| TC-14 | Hari paling produktif | Data seri pada dua tanggal | Dipilih sesuai aturan pemecah seri | FR-14 |
| TC-15 | Laporan tahunan tahun kabisat | Data 2028 | Penyebut memakai 366 hari | FR-16 |
| TC-16 | Heatmap | Arahkan kursor ke sel | *Tooltip* tanggal, jumlah, persentase tampil | FR-16 |
| TC-17 | Ekspor-impor *round-trip* | Ekspor JSON, Ganti dengan file tersebut | Seluruh angka laporan identik | FR-18, FR-19 |
| TC-18 | Impor file rusak | Unggah JSON tidak valid | Pesan galat, data lama tidak berubah | FR-19 |
| TC-19 | Mode Ganti | Impor mode Replace | Cadangan otomatis dibuat sebelum penggantian | FR-19 |
| TC-20 | Keyboard | Navigasi grid dengan panah + Spasi | Sel berpindah dan tercentang | FR-07 |

Selain itu, `lib/metrics` diuji dengan *unit test* untuk kasus batas: penyebut nol, habit diarsipkan di tengah periode, pergantian tahun, dan tahun kabisat.

---

## 11. Tahapan Pengembangan (Milestones)

| Fase | Cakupan | Keluaran |
|---|---|---|
| 1. Fondasi ✅ | Inisialisasi Next.js, Tailwind, Prisma + SQLite, skema, *seed* data setahun, layout & navigasi | Aplikasi berjalan dengan data contoh |
| 2. Habit | FR-01 s.d. FR-05 | Halaman Habit lengkap dengan arsip |
| 3. Pencatatan | FR-06 s.d. FR-11 | Dashboard dan grid bulanan/tahunan |
| 4. Metrik ✅ | `lib/metrics` + unit test, FR-12, FR-13 | Perhitungan teruji, *streak*, tonggak 66 hari |
| 5. Laporan | FR-14 s.d. FR-16 | Tiga halaman laporan dan heatmap |
| 6. Data | FR-17 s.d. FR-20 | Ekspor, impor, pengaturan |
| 7. Pemolesan | NFR, tema gelap, aksesibilitas, pengujian TC-01 s.d. TC-20 | Rilis MVP |

---

## 12. Rencana Pengembangan Lanjutan (Post-MVP)

1. Kebiasaan kuantitatif (nilai numerik dengan target, mis. 8 gelas).
2. Jadwal habit tidak harian (mis. hanya Senin, Rabu, Jumat) yang memengaruhi aturan eligible.
3. Pengingat lokal melalui notifikasi browser.
4. Mode PWA agar dapat dipasang seperti aplikasi.
5. Batas jumlah habit yang dapat diatur di Pengaturan.

---

## 13. Referensi

Lally, P., van Jaarsveld, C. H. M., Potts, H. W. W., & Wardle, J. (2010). How are habits formed: Modelling habit formation in the real world. *European Journal of Social Psychology, 40*(6), 998–1009.
