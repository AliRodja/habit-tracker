import { connection } from "next/server";
import { todayIn } from "@/lib/dates";
import { getSettings } from "./settings-store";

export { getSettings, type Settings } from "./settings-store";

/**
 * "Hari Ini" menurut zona waktu pada Pengaturan.
 * `connection()` menandai nilai ini sebagai data request-time agar tidak ikut diprerender (Cache Components).
 */
export async function getToday(): Promise<string> {
  await connection();
  const { timezone } = await getSettings();
  return todayIn(timezone);
}
