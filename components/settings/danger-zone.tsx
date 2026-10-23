"use client";

import { useActionState, useState } from "react";
import { Notice } from "@/components/ui/notice";
import { btnDanger, inputClass, labelClass } from "@/components/ui/styles";
import { resetAllData } from "@/lib/actions/settings-actions";
import { initialFormState } from "@/lib/actions/types";
import { RESET_CONFIRM_TEXT } from "@/lib/constants";

/** FR-20: "Hapus Semua Data" dengan konfirmasi ketik. */
export function DangerZone() {
  const [state, formAction, pending] = useActionState(resetAllData, initialFormState);
  const [typed, setTyped] = useState("");

  return (
    <form action={formAction} className="grid gap-4">
      <p className="text-sm">
        Menghapus <strong>seluruh habit dan catatan</strong>. Pengaturan tetap. Sebelum menghapus, cadangan JSON dibuat otomatis
        sehingga data masih bisa dipulihkan lewat Impor dengan mode Ganti.
      </p>
      <div>
        <label htmlFor="confirmText" className={labelClass}>
          Ketik <span className="font-semibold">{RESET_CONFIRM_TEXT}</span> untuk melanjutkan
        </label>
        <input id="confirmText" name="confirmText" value={typed} onChange={(event) => setTyped(event.target.value)} autoComplete="off" className={`${inputClass} max-w-xs`} />
      </div>
      <div>
        <button type="submit" className={btnDanger} disabled={typed !== RESET_CONFIRM_TEXT || pending}>
          {pending ? "Menghapus…" : "Hapus Semua Data"}
        </button>
      </div>
      <div role="status" aria-live="polite">
        {state.status === "success" && <Notice tone="success">{state.message}</Notice>}
        {state.status === "error" && <Notice tone="danger">{state.message}</Notice>}
      </div>
    </form>
  );
}
