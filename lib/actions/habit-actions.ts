"use server";

import { revalidatePath } from "next/cache";
import * as habits from "@/lib/services/habit-service";
import { getToday } from "@/lib/services/settings-service";
import type { FormState } from "./types";

const FORM_FIELDS = ["name", "target", "description", "color", "startDate"] as const;

function readHabitForm(formData: FormData): Record<string, string> {
  return Object.fromEntries(FORM_FIELDS.map((field) => [field, String(formData.get(field) ?? "")]));
}

/** Habit dipakai di dashboard, tracker, dan laporan, sehingga seluruh layout divalidasi ulang. */
function refreshViews() {
  revalidatePath("/", "layout");
}

function toState(result: Awaited<ReturnType<typeof habits.deleteHabit>>, values?: Record<string, string>): FormState {
  if (result.ok) {
    refreshViews();
    return { status: "success" };
  }
  return { status: "error", message: result.message, fieldErrors: result.fieldErrors, values };
}

export async function createHabit(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = readHabitForm(formData);
  const result = await habits.createHabit(values, await getToday());
  if (result.ok) {
    refreshViews();
    return { status: "success", message: "Habit ditambahkan." };
  }
  return toState(result, values);
}

export async function updateHabit(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const values = readHabitForm(formData);
  const result = await habits.updateHabit(id, values, await getToday());
  if (result.ok) {
    refreshViews();
    return { status: "success", message: "Perubahan disimpan.", values };
  }
  return toState(result, values);
}

/** Aksi sederhana tanpa form: galat yang lolos dari UI (mis. data basi) ditangkap error boundary. */
function unwrap(result: Awaited<ReturnType<typeof habits.deleteHabit>>) {
  if (!result.ok) throw new Error(result.message);
  refreshViews();
}

export async function archiveHabit(id: string): Promise<void> {
  unwrap(await habits.archiveHabit(id, await getToday()));
}

export async function restoreHabit(id: string): Promise<void> {
  unwrap(await habits.restoreHabit(id));
}

export async function reorderHabits(orderedIds: string[]): Promise<void> {
  unwrap(await habits.reorderHabits(orderedIds));
}

export async function deleteHabit(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  return toState(await habits.deleteHabit(id, String(formData.get("confirmName") ?? "")));
}
