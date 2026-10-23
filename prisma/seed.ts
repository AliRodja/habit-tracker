// Data contoh satu tahun untuk pengembangan dan uji. Deterministik (PRNG ber-seed), aman dijalankan ulang.
try {
  process.loadEnvFile();
} catch {
  // DATABASE_URL bisa datang dari environment
}

import { SETTING_DEFAULTS } from "../lib/constants";
import { dateRange, DEFAULT_TIMEZONE, todayIn } from "../lib/dates";

const SEED_YEAR_START = "2026-01-01";

const HABITS = [
  { name: "Minum Air", target: "8 gelas", description: "Minum air putih sepanjang hari", color: "sky", startDate: SEED_YEAR_START, rate: 0.85 },
  { name: "Olahraga", target: "30 menit", description: "Latihan ringan atau jalan cepat", color: "emerald", startDate: SEED_YEAR_START, rate: 0.6 },
  { name: "Membaca", target: "10 halaman", description: null, color: "violet", startDate: SEED_YEAR_START, rate: 0.7 },
  { name: "Menulis Jurnal", target: "1 entri", description: null, color: "amber", startDate: "2026-03-15", rate: 0.5 },
  { name: "Tidur Teratur", target: "Sebelum 23.00", description: null, color: "rose", startDate: "2026-08-01", rate: 0.75 },
];

/** mulberry32: PRNG kecil agar data seed identik di setiap eksekusi. */
function prng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function main() {
  const { db } = await import("../lib/db");
  const today = todayIn(DEFAULT_TIMEZONE);
  const random = prng(66);

  await db.$transaction(async (tx) => {
    await tx.habitRecord.deleteMany();
    await tx.habit.deleteMany();
    await tx.setting.deleteMany();

    await tx.setting.createMany({
      data: Object.entries(SETTING_DEFAULTS).map(([key, value]) => ({ key, value })),
    });

    for (const [orderIndex, { rate, ...habit }] of HABITS.entries()) {
      const created = await tx.habit.create({ data: { ...habit, orderIndex } });
      const dates = dateRange(habit.startDate, today);
      await tx.habitRecord.createMany({
        data: dates.filter(() => random() < rate).map((date) => ({ habitId: created.id, date, completed: true })),
      });
    }
  });

  const [habits, records] = await Promise.all([db.habit.count(), db.habitRecord.count()]);
  console.log(`Seed selesai: ${habits} habit, ${records} catatan (sampai ${today}).`);
  await db.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
