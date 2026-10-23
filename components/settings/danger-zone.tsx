"use client";

import { useActionState, useState } from "react";
import { resetAllData } from "@/lib/actions/settings-actions";
import { initialFormState } from "@/lib/actions/types";
import { RESET_CONFIRM_TEXT } from "@/lib/constants";
import { btnDanger, inputClass } from "@/components/ui/styles";

/** FR-20: "Hapus Semua Data" dengan konfirmasi ketik. */
export function DangerZone() {
  const [state, formAction, pending] = useActionState(resetAllData, initialFormState);
  const [typed, setTyped] = useState("");

  return (
    <form action={formAction} className="grid gap-3">
      <p className="text-sm">
        Menghapus <strong>seluruh habit dan catatan</strong>. Pengaturan tetap. Cadangan JSON dibuat otomatis lebih dulu, sehingga
        data dapat dipulihkan lewat impor mode Ganti.
      </p>
      <div>
        <label htmlFor="confirmText" className="mb-1 block text-sm font-medium">
          Ketik <span className="font-semibold">{RESET_CONFIRM_TEXT}</span> untuk melanjutkan
        </label>
        <input
          id="confirmText"
          name="confirmText"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          autoComplete="off"
          className={`${inputClass} max-w-xs`}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={btnDanger} disabled={typed !== RESET_CONFIRM_TEXT || pending}>
          {pending ? "Menghapus…" : "Hapus Semua Data"}
        </button>
        <div role="status" aria-live="polite" className="text-sm">
          {state.status === "success" && <span className="break-all text-emerald-700 dark:text-emerald-400">{state.message}</span>}
          {state.status === "error" && <span className="text-red-600 dark:text-red-400">{state.message}</span>}
        </div>
      </div>
    </form>
  );
}
