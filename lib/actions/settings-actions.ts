"use server";

import { revalidatePath } from "next/cache";
import { resetAllData as resetData } from "@/lib/services/data-service";
import { updateSettings as saveSettings } from "@/lib/services/settings-store";
import type { FormState } from "./types";

export async function updateSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = {
    timezone: String(formData.get("timezone") ?? ""),
    weekStartsOn: String(formData.get("weekStartsOn") ?? ""),
    theme: String(formData.get("theme") ?? ""),
    maxActiveHabits: String(formData.get("maxActiveHabits") ?? ""),
  };
  const result = await saveSettings(values);
  if (!result.ok) return { status: "error", message: result.message, fieldErrors: result.fieldErrors, values };

  revalidatePath("/", "layout");
  return { status: "success", message: "Pengaturan disimpan.", values };
}

/** FR-20 zona bahaya: membuat cadangan otomatis sebelum menghapus. */
export async function resetAllData(_prev: FormState, formData: FormData): Promise<FormState> {
  const result = await resetData(String(formData.get("confirmText") ?? ""));
  if (!result.ok) return { status: "error", message: result.message };

  revalidatePath("/", "layout");
  return { status: "success", message: `Seluruh habit dan catatan dihapus. Cadangan otomatis disimpan di ${result.backupPath}` };
}
