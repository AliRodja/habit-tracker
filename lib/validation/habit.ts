import { z } from "zod";
import { HABIT_COLORS } from "@/lib/constants";
import { isDateString, type DateString } from "@/lib/dates";

/** Field opsional dari form: string kosong menjadi null. */
const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} maksimal ${max} karakter`)
    .transform((value) => (value === "" ? null : value));

/** Skema input habit (FR-01, FR-02). `today` dipakai untuk menolak Tanggal Mulai di masa depan. */
export function habitInputSchema(today: DateString) {
  return z.object({
    name: z.string().trim().min(1, "Nama wajib diisi").max(50, "Nama maksimal 50 karakter"),
    target: optionalText(50, "Target"),
    description: optionalText(200, "Deskripsi"),
    color: z.enum(HABIT_COLORS, { error: "Warna tidak valid" }),
    startDate: z
      .string()
      .refine(isDateString, "Tanggal mulai tidak valid")
      .refine((value) => value <= today, "Tanggal mulai tidak boleh di masa depan"),
  });
}

export type HabitInput = z.output<ReturnType<typeof habitInputSchema>>;

export const noteSchema = optionalText(200, "Catatan");

export type FieldErrors = Record<string, string[] | undefined>;

/** Ubah galat Zod menjadi pesan per kolom. */
export function fieldErrorsOf(error: z.ZodError): FieldErrors {
  return z.flattenError(error).fieldErrors;
}
