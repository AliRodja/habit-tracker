"use client";

import { useActionState, useEffect } from "react";
import { FormStatus } from "@/components/ui/notice";
import { btnPrimary, btnSecondary, inputClass, labelClass } from "@/components/ui/styles";
import { initialFormState, type FormState } from "@/lib/actions/types";
import { HABIT_COLORS } from "@/lib/constants";
import { HABIT_COLOR_STYLES } from "@/lib/habit-colors";

export interface HabitFormValues {
  name: string;
  target: string;
  description: string;
  color: string;
  startDate: string;
}

interface HabitFormProps {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaults: HabitFormValues;
  today: string;
  submitLabel: string;
  idPrefix: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function HabitForm({ action, defaults, today, submitLabel, idPrefix, onSuccess, onCancel }: HabitFormProps) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  // Form direset React setelah action selesai; isian dikembalikan dari state agar tidak hilang saat galat.
  const values = { ...defaults, ...state.values };
  const errorOf = (field: string) => state.fieldErrors?.[field]?.[0];

  useEffect(() => {
    if (state.status === "success") onSuccess?.();
  }, [state, onSuccess]);

  function field(name: keyof HabitFormValues, label: string, input: (props: object) => React.ReactNode, hint?: string) {
    const error = errorOf(name);
    const id = `${idPrefix}-${name}`;
    const props = {
      id,
      name,
      defaultValue: values[name],
      "aria-invalid": error ? true : undefined,
      "aria-describedby": error ? `${id}-error` : hint ? `${id}-hint` : undefined,
      className: inputClass,
    };
    return (
      <div>
        <label htmlFor={id} className={labelClass}>
          {label}
        </label>
        {input(props)}
        {hint && !error && (
          <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted">
            {hint}
          </p>
        )}
        {error && (
          <p id={`${id}-error`} className="mt-1.5 text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-4">
      <fieldset disabled={pending} className="grid gap-4">
        {field("name", "Nama", (p) => <input {...p} type="text" required maxLength={60} placeholder="Contoh: Minum Air" autoComplete="off" />)}

        {field(
          "target",
          "Target harian (opsional)",
          (p) => <input {...p} type="text" placeholder="Contoh: 8 gelas" autoComplete="off" />,
          "Hanya sebagai pengingat. Penilaian tetap selesai atau belum.",
        )}

        {field("description", "Deskripsi (opsional)", (p) => <textarea {...p} rows={2} placeholder="Contoh: Minum air putih sepanjang hari" />)}

        {field(
          "startDate",
          "Tanggal mulai",
          (p) => <input {...p} type="date" required max={today} />,
          "Hari-hari sebelum tanggal ini tidak dihitung di statistik.",
        )}

        <fieldset>
          <legend className={labelClass}>Warna</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {HABIT_COLORS.map((color) => (
              <label key={color} className="cursor-pointer">
                <input type="radio" name="color" value={color} defaultChecked={values.color === color} className="peer sr-only" />
                <span className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-2 text-sm peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:font-medium peer-focus-visible:outline-2 peer-focus-visible:outline-accent">
                  <span className={`size-3.5 rounded-full ${HABIT_COLOR_STYLES[color].dot}`} aria-hidden />
                  {HABIT_COLOR_STYLES[color].label}
                </span>
              </label>
            ))}
          </div>
          {errorOf("color") && <p className="mt-1.5 text-sm text-danger">{errorOf("color")}</p>}
        </fieldset>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
          <div className="mr-auto">
            <FormStatus status={state.status === "error" ? "error" : "idle"} message={state.message} />
          </div>
          {onCancel && (
            <button type="button" className={btnSecondary} onClick={onCancel}>
              Batal
            </button>
          )}
          <button type="submit" className={btnPrimary}>
            {pending ? "Menyimpan…" : submitLabel}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
