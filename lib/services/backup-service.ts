import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildExportFile, fileStamp } from "./export-service";
import { getSettings } from "./settings-store";

/** Lokasi cadangan otomatis; dapat diubah lewat BACKUP_DIR. */
export function getBackupDir(): string {
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), process.env.BACKUP_DIR ?? "data/backups");
}

/**
 * Tulis cadangan JSON lengkap sebelum operasi yang menghapus data (FR-19.4, resetAllData).
 * Gagal menulis berarti operasi dibatalkan: pemanggil tidak boleh melanjutkan tanpa cadangan.
 */
export async function writeBackup(reason: string, dir: string = getBackupDir(), now: Date = new Date()): Promise<string> {
  const [{ timezone }, file] = await Promise.all([getSettings(), buildExportFile(now)]);
  await mkdir(dir, { recursive: true });
  const target = path.join(dir, `habit-tracker-backup-${fileStamp(timezone, now, true)}-${reason}.json`);
  await writeFile(target, JSON.stringify(file, null, 2), { flag: "wx" });
  return target;
}
