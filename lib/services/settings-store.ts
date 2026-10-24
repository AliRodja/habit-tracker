import { parseHabitLimit, SETTING_DEFAULTS } from "@/lib/constants";
import { db } from "@/lib/db";
import { fieldErrorsOf, type FieldErrors } from "@/lib/validation/habit";
import { settingsSchema } from "@/lib/validation/settings";

export type Settings = { -readonly [K in keyof typeof SETTING_DEFAULTS]: string };

export async function getSettings(): Promise<Settings> {
  const rows = await db.setting.findMany();
  const stored = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return { ...SETTING_DEFAULTS, ...stored };
}

export type UpdateSettingsResult = { ok: true } | { ok: false; message: string; fieldErrors?: FieldErrors };

/** Batas habit aktif yang berlaku saat ini (FR-01, FR-20). */
export async function getActiveHabitLimit(): Promise<number> {
  return parseHabitLimit((await getSettings()).maxActiveHabits);
}

/**
 * FR-20: simpan pengaturan dalam satu transaksi. Batas habit aktif tidak boleh diturunkan di bawah jumlah
 * habit aktif saat ini; pengguna diminta mengarsipkan sebagian terlebih dahulu (tidak ada arsip otomatis).
 */
export async function updateSettings(raw: unknown): Promise<UpdateSettingsResult> {
  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "Periksa kembali isian Anda.", fieldErrors: fieldErrorsOf(parsed.error) };

  return db.$transaction(async (tx) => {
    const limit = Number(parsed.data.maxActiveHabits);
    const active = await tx.habit.count({ where: { isActive: true } });
    if (active > limit) {
      return {
        ok: false as const,
        message: "Periksa kembali isian Anda.",
        fieldErrors: {
          maxActiveHabits: [`Saat ini ada ${active} habit aktif. Arsipkan ${active - limit} habit terlebih dahulu sebelum menurunkan batas ke ${limit}.`],
        },
      };
    }
    for (const [key, value] of Object.entries(parsed.data)) {
      await tx.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
    }
    return { ok: true as const };
  });
}

/** Simpan hanya tema (dipakai tombol terang/gelap di header). Nilai divalidasi di server. */
export async function updateTheme(raw: unknown): Promise<{ ok: true } | { ok: false; message: string }> {
  const parsed = settingsSchema.shape.theme.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "Tema tidak valid." };
  await db.setting.upsert({ where: { key: "theme" }, create: { key: "theme", value: parsed.data }, update: { value: parsed.data } });
  return { ok: true };
}
