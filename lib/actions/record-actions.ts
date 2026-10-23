"use server";

import { revalidatePath } from "next/cache";
import * as records from "@/lib/services/record-service";
import { getToday } from "@/lib/services/settings-service";
import type { ActionResult } from "./types";

function finish(result: Awaited<ReturnType<typeof records.setRecord>>): ActionResult {
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Validasi tanggal masa depan dan rentang eligible dilakukan di server, bukan hanya di UI (TC-07). */
export async function setRecord(habitId: string, date: string, completed: boolean): Promise<ActionResult> {
  return finish(await records.setRecord(habitId, date, completed, await getToday()));
}

export async function setRecordNote(habitId: string, date: string, note: string): Promise<ActionResult> {
  return finish(await records.setRecordNote(habitId, date, note, await getToday()));
}
