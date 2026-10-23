"use client";

import { Trash2 } from "lucide-react";
import { useActionState, useId, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Notice } from "@/components/ui/notice";
import { btnDanger, btnGhost, btnSecondary, inputClass, labelClass } from "@/components/ui/styles";
import { initialFormState, type FormState } from "@/lib/actions/types";

interface Props {
  habitName: string;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}

/** FR-04: penghapusan permanen mewajibkan mengetik nama habit. */
export function DeleteHabitDialog({ habitName, action }: Props) {
  return (
    <Modal
      title={`Hapus “${habitName}” permanen?`}
      trigger={(open) => (
        <button type="button" className={btnGhost} onClick={open} aria-label={`Hapus permanen ${habitName}`}>
          <Trash2 className="size-4" aria-hidden /> <span className="max-sm:sr-only">Hapus permanen</span>
        </button>
      )}
    >
      {(close) => <DeleteForm habitName={habitName} action={action} onCancel={close} />}
    </Modal>
  );
}

function DeleteForm({ habitName, action, onCancel }: Props & { onCancel: () => void }) {
  const uid = useId();
  const [typed, setTyped] = useState("");
  const [state, formAction, pending] = useActionState(action, initialFormState);

  return (
    <form action={formAction} className="grid gap-4">
      <Notice tone="danger">Seluruh catatan habit ini ikut terhapus dan tidak dapat dikembalikan. Bila hanya ingin menyimpannya, biarkan di Arsip.</Notice>
      <div>
        <label htmlFor={`${uid}-confirm`} className={labelClass}>
          Ketik <span className="font-semibold">{habitName}</span> untuk melanjutkan
        </label>
        <input id={`${uid}-confirm`} name="confirmName" value={typed} onChange={(event) => setTyped(event.target.value)} autoComplete="off" className={inputClass} />
      </div>
      {state.status === "error" && (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      )}
      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <button type="button" className={btnSecondary} onClick={onCancel}>
          Batal
        </button>
        <button type="submit" className={btnDanger} disabled={typed !== habitName || pending}>
          {pending ? "Menghapus…" : "Hapus permanen"}
        </button>
      </div>
    </form>
  );
}
