"use client";

import { useActionState } from "react";
import { HABIT_COLORS, MAX_ACTIVE_HABITS } from "@/lib/constants";
import { HABIT_COLOR_STYLES } from "@/lib/habit-colors";
import { initialFormState, type FormState } from "@/lib/actions/types";
import { btnPrimary, inputClass } from "@/components/ui/styles";

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
  /** Dinonaktifkan saat batas 5 habit aktif tercapai (FR-01). */
  disabledReason?: string;
  idPrefix: string;
}

export function HabitForm({ action, defaults, today, submitLabel, disabledReason, idPrefix }: HabitFormProps) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  // Form direset React setelah action selesai; isian dikembalikan dari state agar tidak hilang saat galat.
  const values = { ...defaults, ...state.values };
  const errorOf = (field: string) => state.fieldErrors?.[field]?.[0];

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
        <label htmlFor={id} className="mb-1 block text-sm font-medium">
          {label}
        </label>
        {input(props)}
        {hint && !error && (
          <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
            {hint}
          </p>
        )}
        {error && (
          <p id={`${id}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-4">
      <fieldset disabled={Boolean(disabledReason) || pending} className="grid gap-4 disabled:opacity-60">
        <div className="grid gap-4 sm:grid-cols-2">
          {field("name", "Nama", (p) => (
            <input {...p} type="text" required maxLength={60} placeholder="Minum Air" autoComplete="off" />
          ))}
          {field("target", "Target harian (opsional)", (p) => (
            <input {...p} type="text" placeholder="8 gelas" autoComplete="off" />
          ))}
        </div>

        {field("description", "Deskripsi (opsional)", (p) => (
          <textarea {...p} rows={2} placeholder="Minum air putih sepanjang hari" />
        ))}

        <div className="grid gap-4 sm:grid-cols-2">
          {field(
            "startDate",
            "Tanggal mulai",
            (p) => <input {...p} type="date" required max={today} />,
            "Catatan sebelum tanggal ini tidak dihitung dalam statistik.",
          )}

          <fieldset>
            <legend className="mb-1 text-sm font-medium">Warna</legend>
            <div className="flex flex-wrap gap-2">
              {HABIT_COLORS.map((color) => (
                <label key={color} className="cursor-pointer">
                  <input
                    type="radio"
                    name="color"
                    value={color}
                    defaultChecked={values.color === color}
                    className="peer sr-only"
                  />
                  <span className="flex items-center gap-1.5 rounded-lg border border-border px-2 py-1 text-xs peer-checked:border-foreground peer-checked:font-semibold peer-focus-visible:outline-2 peer-focus-visible:outline-foreground">
                    <span className={`size-3 rounded-full ${HABIT_COLOR_STYLES[color].dot}`} aria-hidden />
                    {HABIT_COLOR_STYLES[color].label}
                  </span>
                </label>
              ))}
            </div>
            {errorOf("color") && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errorOf("color")}</p>}
          </fieldset>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className={btnPrimary}>
            {pending ? "Menyimpan…" : submitLabel}
          </button>
          <div role="status" aria-live="polite" className="text-sm">
            {state.status === "success" && <span className="text-emerald-700 dark:text-emerald-400">{state.message}</span>}
            {state.status === "error" && state.message && (
              <span className="text-red-600 dark:text-red-400">{state.message}</span>
            )}
          </div>
        </div>
      </fieldset>
      {disabledReason && (
        <p className="text-sm text-muted">
          {disabledReason} (maksimal {MAX_ACTIVE_HABITS} habit aktif)
        </p>
      )}
    </form>
  );
}
