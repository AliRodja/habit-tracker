"use client";

import { Trash2 } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import { initialFormState, type FormState } from "@/lib/actions/types";
import { btnDanger, btnSecondary, inputClass } from "@/components/ui/styles";

interface Props {
  habitName: string;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}

/** FR-04: penghapusan permanen mewajibkan mengetik nama habit. */
export function DeleteHabitDialog({ habitName, action }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [typed, setTyped] = useState("");
  const [state, formAction, pending] = useActionState(action, initialFormState);

  function close() {
    dialogRef.current?.close();
    setTyped("");
  }

  return (
    <>
      <button type="button" className={btnSecondary} onClick={() => dialogRef.current?.showModal()}>
        <Trash2 className="size-4" aria-hidden /> Hapus permanen
      </button>
      <dialog
        ref={dialogRef}
        onClose={() => setTyped("")}
        aria-labelledby="delete-title"
        className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-border bg-surface p-5 text-foreground backdrop:bg-black/50"
      >
        <form action={formAction} className="grid gap-4">
          <h2 id="delete-title" className="text-lg font-semibold">
            Hapus “{habitName}” permanen?
          </h2>
          <p className="text-sm text-muted">
            Seluruh catatan habit ini ikut terhapus dan tidak dapat dikembalikan. Ketik nama habit untuk
            melanjutkan.
          </p>
          <div>
            <label htmlFor="confirmName" className="mb-1 block text-sm font-medium">
              Ketik <span className="font-semibold">{habitName}</span>
            </label>
            <input
              id="confirmName"
              name="confirmName"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              className={inputClass}
            />
          </div>
          {state.status === "error" && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {state.message}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" className={btnSecondary} onClick={close}>
              Batal
            </button>
            <button type="submit" className={btnDanger} disabled={typed !== habitName || pending}>
              {pending ? "Menghapus…" : "Hapus permanen"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
