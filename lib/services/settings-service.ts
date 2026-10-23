import { connection } from "next/server";
import { SETTING_DEFAULTS } from "@/lib/constants";
import { db } from "@/lib/db";
import { todayIn } from "@/lib/dates";

export type Settings = { -readonly [K in keyof typeof SETTING_DEFAULTS]: string };

export async function getSettings(): Promise<Settings> {
  const rows = await db.setting.findMany();
  const stored = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return { ...SETTING_DEFAULTS, ...stored };
}

/**
 * "Hari Ini" menurut zona waktu pada Pengaturan.
 * `connection()` menandai nilai ini sebagai data request-time agar tidak ikut diprerender (Cache Components).
 */
export async function getToday(): Promise<string> {
  await connection();
  const { timezone } = await getSettings();
  return todayIn(timezone);
}
