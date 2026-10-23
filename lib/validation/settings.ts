import { z } from "zod";
import { THEMES } from "@/lib/constants";
import { isValidTimeZone } from "@/lib/dates";

/** FR-20. Nilai yang diizinkan divalidasi di server. */
export const settingsSchema = z.object({
  timezone: z.string().trim().refine(isValidTimeZone, "Zona waktu tidak valid"),
  weekStartsOn: z.enum(["0", "1"], { error: "Pilih Senin atau Minggu" }),
  theme: z.enum(THEMES, { error: "Pilih terang, gelap, atau sistem" }),
});

export type SettingsInput = z.output<typeof settingsSchema>;
