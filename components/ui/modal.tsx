"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export const dialogClass =
  "m-auto w-[min(32rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-border bg-surface p-0 text-foreground shadow-xl backdrop:bg-black/50";

interface Props {
  title: string;
  description?: ReactNode;
  /** Tombol pembuka; menerima fungsi untuk membuka dialog. */
  trigger: (open: () => void) => ReactNode;
  /** Isi dialog; menerima fungsi untuk menutupnya (mis. setelah berhasil menyimpan). */
  children: (close: () => void) => ReactNode;
  defaultOpen?: boolean;
}

/**
 * Dialog modal berbasis <dialog> bawaan browser (fokus terkunci, Esc menutup).
 * Isi dipasang ulang setiap kali dialog ditutup sehingga form selalu mulai bersih.
 */
export function Modal({ title, description, trigger, children, defaultOpen = false }: Props) {
  const uid = useId();
  const ref = useRef<HTMLDialogElement>(null);
  const [isOpen, setOpen] = useState(defaultOpen);
  const [version, setVersion] = useState(0);

  // Status buka/tutup disimpan di state; efek ini menyelaraskannya dengan elemen <dialog>.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  const open = () => setOpen(true);
  const close = () => setOpen(false);

  return (
    <>
      {trigger(open)}
      <dialog ref={ref} aria-labelledby={`${uid}-title`} onClose={() => {
          setOpen(false);
          setVersion((v) => v + 1);
        }} className={dialogClass}>
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2 id={`${uid}-title`} className="text-lg font-semibold">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          <button type="button" onClick={close} className="-m-1 rounded-lg p-1 text-muted hover:bg-surface-2 hover:text-foreground" aria-label="Tutup">
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <div key={version} className="px-5 py-4">
          {children(close)}
        </div>
      </dialog>
    </>
  );
}
