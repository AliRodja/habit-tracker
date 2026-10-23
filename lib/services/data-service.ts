import { RESET_CONFIRM_TEXT } from "@/lib/constants";
import { db } from "@/lib/db";
import { writeBackup } from "./backup-service";

/**
 * FR-20: hapus seluruh habit dan catatan. Cadangan otomatis dibuat lebih dulu; pengaturan dipertahankan.
 * Mengembalikan lokasi berkas cadangan.
 */
export async function resetAllData(confirmText: string, backupDir?: string): Promise<{ ok: true; backupPath: string } | { ok: false; message: string }> {
  if (confirmText !== RESET_CONFIRM_TEXT) return { ok: false, message: `Ketik ${RESET_CONFIRM_TEXT} untuk melanjutkan.` };

  const backupPath = await writeBackup("sebelum-hapus", backupDir);
  await db.$transaction([db.habitRecord.deleteMany(), db.habit.deleteMany()]);
  return { ok: true, backupPath };
}
