import { SETTING_DEFAULTS } from "@/lib/constants";
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

/** FR-20: simpan zona waktu, hari awal minggu, dan tema dalam satu transaksi. */
export async function updateSettings(raw: unknown): Promise<UpdateSettingsResult> {
  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "Periksa kembali isian Anda.", fieldErrors: fieldErrorsOf(parsed.error) };

  await db.$transaction(
    Object.entries(parsed.data).map(([key, value]) =>
      db.setting.upsert({ where: { key }, create: { key, value }, update: { value } }),
    ),
  );
  return { ok: true };
}
