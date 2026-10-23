"use client";

import { useActionState, useEffect } from "react";
import { updateSettings } from "@/lib/actions/settings-actions";
import { initialFormState } from "@/lib/actions/types";
import type { Theme } from "@/lib/constants";
import { applyTheme } from "@/lib/theme";
import { btnPrimary, inputClass } from "@/components/ui/styles";

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: "system", label: "Ikuti sistem" },
  { value: "light", label: "Terang" },
  { value: "dark", label: "Gelap" },
];

const WEEK_OPTIONS = [
  { value: "1", label: "Senin" },
  { value: "0", label: "Minggu" },
];

interface Props {
  timeZones: string[];
  defaults: { timezone: string; weekStartsOn: string; theme: string };
}

export function SettingsForm({ timeZones, defaults }: Props) {
  const [state, formAction, pending] = useActionState(updateSettings, initialFormState);
  const values = { ...defaults, ...state.values };
  const error = (field: string) => state.fieldErrors?.[field]?.[0];

  // Terapkan tema seketika setelah tersimpan, tanpa menunggu render ulang dari server.
  useEffect(() => {
    if (state.status === "success" && state.values?.theme) applyTheme(state.values.theme as Theme);
  }, [state]);

  const radio = (name: string, options: { value: string; label: string }[], current: string) => (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <label key={option.value} className="cursor-pointer">
          <input type="radio" name={name} value={option.value} defaultChecked={current === option.value} className="peer sr-only" />
          <span className="block rounded-lg border border-border bg-surface px-3 py-1.5 text-sm peer-checked:border-foreground peer-checked:font-semibold peer-focus-visible:outline-2 peer-focus-visible:outline-foreground">
            {option.label}
          </span>
        </label>
      ))}
    </div>
  );

  return (
    <form action={formAction} className="grid gap-5">
      <div>
        <label htmlFor="timezone" className="mb-1 block text-sm font-medium">
          Zona waktu
        </label>
        <select id="timezone" name="timezone" defaultValue={values.timezone} className={`${inputClass} max-w-sm`} aria-invalid={error("timezone") ? true : undefined}>
          {timeZones.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-muted">Menentukan batas “Hari Ini”. Tanggal disimpan tanpa jam sehingga catatan lama tidak bergeser.</p>
        {error("timezone") && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error("timezone")}</p>}
      </div>

      <fieldset>
        <legend className="mb-1 text-sm font-medium">Awal minggu</legend>
        {radio("weekStartsOn", WEEK_OPTIONS, values.weekStartsOn)}
        <p className="mt-1 text-xs text-muted">Dipakai pada laporan mingguan “Minggu kalender”.</p>
        {error("weekStartsOn") && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error("weekStartsOn")}</p>}
      </fieldset>

      <fieldset>
        <legend className="mb-1 text-sm font-medium">Tema</legend>
        {radio("theme", THEME_OPTIONS, values.theme)}
        {error("theme") && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error("theme")}</p>}
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={btnPrimary} disabled={pending}>
          {pending ? "Menyimpan…" : "Simpan pengaturan"}
        </button>
        <div role="status" aria-live="polite" className="text-sm">
          {state.status === "success" && <span className="text-emerald-700 dark:text-emerald-400">{state.message}</span>}
          {state.status === "error" && state.message && <span className="text-red-600 dark:text-red-400">{state.message}</span>}
        </div>
      </div>
    </form>
  );
}
