"use client";

import { useActionState, useEffect } from "react";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { FormStatus } from "@/components/ui/notice";
import { btnPrimary, inputClass, labelClass } from "@/components/ui/styles";
import { updateSettings } from "@/lib/actions/settings-actions";
import { initialFormState } from "@/lib/actions/types";
import { HABIT_LIMIT, type Theme } from "@/lib/constants";
import { applyGamification, applyTheme } from "@/lib/theme";

const THEME_OPTIONS = [
  { value: "system", label: "Ikuti sistem" },
  { value: "light", label: "Terang" },
  { value: "dark", label: "Gelap" },
];

const LIMIT_OPTIONS = Array.from({ length: HABIT_LIMIT.max - HABIT_LIMIT.min + 1 }, (_, i) => HABIT_LIMIT.min + i);

const GAMIFICATION_OPTIONS = [
  { value: "on", label: "Aktif" },
  { value: "off", label: "Nonaktif" },
];

const WEEK_OPTIONS = [
  { value: "1", label: "Senin" },
  { value: "0", label: "Minggu" },
];

interface Props {
  timeZones: string[];
  defaults: { timezone: string; weekStartsOn: string; theme: string; maxActiveHabits: string; gamification: string };
}

export function SettingsForm({ timeZones, defaults }: Props) {
  const [state, formAction, pending] = useActionState(updateSettings, initialFormState);
  const values = { ...defaults, ...state.values };
  const error = (field: string) => state.fieldErrors?.[field]?.[0];

  // Terapkan tema seketika setelah tersimpan, tanpa menunggu render ulang dari server.
  useEffect(() => {
    if (state.status !== "success" || !state.values) return;
    if (state.values.theme) applyTheme(state.values.theme as Theme);
    if (state.values.gamification) applyGamification(state.values.gamification !== "off");
  }, [state]);

  return (
    <form action={formAction} className="grid gap-6">
      <div>
        <label htmlFor="timezone" className={labelClass}>
          Zona waktu
        </label>
        <select id="timezone" name="timezone" defaultValue={values.timezone} className={`${inputClass} max-w-sm`} aria-invalid={error("timezone") ? true : undefined} aria-describedby="timezone-hint">
          {timeZones.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
        <p id="timezone-hint" className="mt-1.5 text-xs text-muted">
          Menentukan kapan “hari ini” berganti. Catatan lama tidak ikut bergeser.
        </p>
        {error("timezone") && <p className="mt-1.5 text-sm text-danger">{error("timezone")}</p>}
      </div>

      <div>
        <label htmlFor="maxActiveHabits" className={labelClass}>
          Batas habit aktif
        </label>
        <select
          id="maxActiveHabits"
          name="maxActiveHabits"
          defaultValue={values.maxActiveHabits}
          className={`${inputClass} max-w-48`}
          aria-invalid={error("maxActiveHabits") ? true : undefined}
          aria-describedby="maxActiveHabits-hint"
        >
          {LIMIT_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n} habit{n === HABIT_LIMIT.default ? " (bawaan)" : ""}
            </option>
          ))}
        </select>
        <p id="maxActiveHabits-hint" className="mt-1.5 text-xs text-muted">
          Disarankan 3–5 agar tetap fokus. Habit di arsip tidak dihitung.
        </p>
        {error("maxActiveHabits") && <p className="mt-1.5 text-sm text-danger">{error("maxActiveHabits")}</p>}
      </div>

      <fieldset>
        <legend className={labelClass}>Minggu dimulai pada</legend>
        <ChoiceChips name="weekStartsOn" options={WEEK_OPTIONS} defaultValue={values.weekStartsOn} />
        <p className="mt-1.5 text-xs text-muted">Dipakai di laporan mingguan dengan pilihan “Minggu kalender”.</p>
        {error("weekStartsOn") && <p className="mt-1.5 text-sm text-danger">{error("weekStartsOn")}</p>}
      </fieldset>

      <fieldset>
        <legend className={labelClass}>Gamifikasi</legend>
        <ChoiceChips name="gamification" options={GAMIFICATION_OPTIONS} defaultValue={values.gamification} />
        <p className="mt-1.5 text-xs text-muted">Api harian, XP, tantangan mingguan, dan lencana. Matikan bila lebih suka tampilan yang tenang; data tidak hilang.</p>
        {error("gamification") && <p className="mt-1.5 text-sm text-danger">{error("gamification")}</p>}
      </fieldset>

      <fieldset>
        <legend className={labelClass}>Tampilan</legend>
        <ChoiceChips name="theme" options={THEME_OPTIONS} defaultValue={values.theme} />
        {error("theme") && <p className="mt-1.5 text-sm text-danger">{error("theme")}</p>}
      </fieldset>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <button type="submit" className={btnPrimary} disabled={pending}>
          {pending ? "Menyimpan…" : "Simpan pengaturan"}
        </button>
        <FormStatus status={state.status} message={state.message} />
      </div>
    </form>
  );
}
