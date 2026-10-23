"use client";

import { Pencil, Plus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { btnPrimary, btnSecondary } from "@/components/ui/styles";
import type { FormState } from "@/lib/actions/types";
import { HabitForm, type HabitFormValues } from "./habit-form";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export function AddHabitDialog({ action, today, defaultOpen }: { action: Action; today: string; defaultOpen?: boolean }) {
  return (
    <Modal
      title="Tambah habit"
      description="Pilih kebiasaan kecil yang realistis untuk dilakukan setiap hari."
      defaultOpen={defaultOpen}
      trigger={(open) => (
        <button type="button" className={btnPrimary} onClick={open}>
          <Plus className="size-4" aria-hidden /> Tambah habit
        </button>
      )}
    >
      {(close) => (
        <HabitForm
          idPrefix="new"
          action={action}
          today={today}
          submitLabel="Simpan habit"
          onSuccess={close}
          onCancel={close}
          defaults={{ name: "", target: "", description: "", color: "emerald", startDate: today }}
        />
      )}
    </Modal>
  );
}

export function EditHabitDialog({ habitId, name, action, today, defaults }: { habitId: string; name: string; action: Action; today: string; defaults: HabitFormValues }) {
  return (
    <Modal
      title={`Ubah “${name}”`}
      trigger={(open) => (
        <button type="button" className={btnSecondary} onClick={open} aria-label={`Ubah ${name}`}>
          <Pencil className="size-4" aria-hidden /> Ubah
        </button>
      )}
    >
      {(close) => (
        <HabitForm idPrefix={`edit-${habitId}`} action={action} today={today} submitLabel="Simpan perubahan" onSuccess={close} onCancel={close} defaults={defaults} />
      )}
    </Modal>
  );
}
