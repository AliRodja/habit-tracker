import { z } from "zod";
import { HABIT_COLORS, THEMES } from "@/lib/constants";
import { isDateString, isValidTimeZone } from "@/lib/dates";

export const EXPORT_APP = "daily-habit-tracker";
export const EXPORT_SCHEMA_VERSION = 1;

export interface ImportIssue {
  scope: "file" | "habit" | "record" | "csv";
  /** Nomor baris (mulai 1) pada daftar/berkas; null untuk galat tingkat berkas. */
  row: number | null;
  message: string;
}

const dateField = z.string().refine(isDateString, "tanggal tidak valid (gunakan YYYY-MM-DD)");
const nullableText = (max: number, label: string) =>
  z.string().max(max, `${label} maksimal ${max} karakter`).nullish().transform((value) => value ?? null);

const habitSchema = z
  .object({
    id: z.string().min(1, "id wajib diisi").max(100, "id terlalu panjang"),
    name: z.string().trim().min(1, "nama wajib diisi").max(50, "nama maksimal 50 karakter"),
    description: nullableText(200, "deskripsi"),
    target: nullableText(50, "target"),
    color: z.enum(HABIT_COLORS, { error: `warna harus salah satu dari: ${HABIT_COLORS.join(", ")}` }),
    orderIndex: z.number({ error: "orderIndex harus berupa angka" }).int("orderIndex harus bilangan bulat").min(0, "orderIndex tidak boleh negatif"),
    isActive: z.boolean({ error: "isActive harus true atau false" }),
    startDate: dateField,
    archivedAt: dateField.nullish().transform((value) => value ?? null),
  })
  .refine((habit) => (habit.isActive ? habit.archivedAt === null : habit.archivedAt !== null), {
    message: "habit aktif tidak boleh memiliki archivedAt, dan habit nonaktif wajib memilikinya",
    path: ["archivedAt"],
  });

const recordSchema = z.object({
  habitId: z.string().min(1, "habitId wajib diisi"),
  date: dateField,
  completed: z.boolean({ error: "completed harus true atau false" }),
  note: nullableText(200, "catatan"),
});

const settingsSchema = z
  .object({
    timezone: z.string().refine(isValidTimeZone, "zona waktu tidak valid"),
    weekStartsOn: z.enum(["0", "1"], { error: 'weekStartsOn harus "0" (Minggu) atau "1" (Senin)' }),
    theme: z.enum(THEMES, { error: `theme harus salah satu dari: ${THEMES.join(", ")}` }),
  })
  .partial();

/** Skema berkas ekspor JSON (PRD bagian 9.3). Properti tak dikenal diabaikan agar kompatibel ke depan. */
export const exportFileSchema = z.object({
  app: z.literal(EXPORT_APP, { error: "bukan berkas ekspor Daily Habit Tracker" }),
  schemaVersion: z.literal(EXPORT_SCHEMA_VERSION, { error: `schemaVersion ${EXPORT_SCHEMA_VERSION} saja yang didukung` }),
  exportedAt: z.string().optional(),
  settings: settingsSchema.optional(),
  habits: z.array(habitSchema, { error: "habits harus berupa daftar" }),
  records: z.array(recordSchema, { error: "records harus berupa daftar" }),
});

export type ExportFile = z.output<typeof exportFileSchema>;
export type ExportHabit = ExportFile["habits"][number];
export type ExportRecord = ExportFile["records"][number];
export type ExportSettings = NonNullable<ExportFile["settings"]>;

/** Ubah galat Zod menjadi galat per baris yang dapat dibaca pengguna. */
export function issuesFromZod(error: z.ZodError): ImportIssue[] {
  return error.issues.map((issue): ImportIssue => {
    const [section, index, field] = issue.path;
    if ((section === "habits" || section === "records") && typeof index === "number") {
      const scope = section === "habits" ? "habit" : "record";
      return { scope, row: index + 1, message: `${field !== undefined ? `${String(field)}: ` : ""}${issue.message}` };
    }
    return { scope: "file", row: null, message: `${issue.path.map(String).join(".") || "berkas"}: ${issue.message}` };
  });
}
