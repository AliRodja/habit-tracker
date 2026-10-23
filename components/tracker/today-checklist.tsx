"use client";

import { Check, Flame } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { setRecord } from "@/lib/actions/record-actions";
import { colorDot } from "@/lib/habit-colors";
import { formatPercent } from "@/lib/format";
import type { TodayItem } from "@/lib/services/dashboard-service";

type Checked = Record<string, boolean>;

export function TodayChecklist({ items, today }: { items: TodayItem[]; today: string }) {
  const serverChecked: Checked = Object.fromEntries(items.map((item) => [item.habit.id, item.checkedToday]));
  const [checked, setChecked] = useOptimistic<Checked, { id: string; value: boolean }>(
    serverChecked,
    (state, { id, value }) => ({ ...state, [id]: value }),
  );
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const done = items.filter((item) => checked[item.habit.id]).length;
  const ratio = items.length === 0 ? null : done / items.length;

  function toggle(id: string) {
    const next = !checked[id];
    startTransition(async () => {
      setChecked({ id, value: next });
      try {
        const result = await setRecord(id, today, next);
        setError(result.ok ? null : result.message);
      } catch {
        setError("Gagal menyimpan. Periksa koneksi lalu coba lagi.");
      }
      // Bila gagal, nilai optimistik kembali sendiri ke data server saat transition selesai (FR-11).
    });
  }

  return (
    <div>
      <div className="mt-4 rounded-xl border border-border bg-surface p-4">
        <div className="flex items-baseline justify-between gap-4">
          <p className="font-medium">
            {done} dari {items.length} selesai
          </p>
          <p className="text-2xl font-semibold tabular-nums" aria-label={`Progres hari ini ${formatPercent(ratio)}`}>
            {formatPercent(ratio)}
          </p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-border" aria-hidden>
          <div className="h-full rounded-full bg-emerald-500 transition-[width]" style={{ width: `${(ratio ?? 0) * 100}%` }} />
        </div>
      </div>

      <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
        {error}
      </p>

      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const id = item.habit.id;
          const isChecked = checked[id];
          const streak = isChecked ? item.streak.ifChecked : item.streak.ifUnchecked;
          const days = isChecked ? item.completedDays.ifChecked : item.completedDays.ifUnchecked;
          const formed = days >= item.milestoneTarget;

          return (
            <li key={id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  aria-pressed={isChecked}
                  aria-label={`${item.habit.name}${item.habit.target ? `, target ${item.habit.target}` : ""}`}
                  className={`flex size-10 shrink-0 items-center justify-center rounded-lg border-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground ${
                    isChecked ? `${colorDot(item.habit.color)} border-transparent text-white` : "border-border bg-background hover:border-muted"
                  }`}
                >
                  {isChecked && <Check className="size-5" aria-hidden strokeWidth={3} />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.habit.name}</p>
                  {item.habit.target && <p className="text-sm text-muted">{item.habit.target}</p>}
                </div>
                <p className="flex items-center gap-1 text-sm text-muted" title="Streak saat ini">
                  <Flame className="size-4" aria-hidden />
                  <span className="tabular-nums">{streak}</span>
                  <span className="sr-only">hari berturut-turut</span>
                </p>
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>Menuju kebiasaan terbentuk</span>
                  <span className="tabular-nums">
                    {Math.min(days, item.milestoneTarget)} / {item.milestoneTarget} hari
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border" aria-hidden>
                  <div
                    className={`h-full rounded-full ${colorDot(item.habit.color)}`}
                    style={{ width: `${Math.min(100, (days / item.milestoneTarget) * 100)}%` }}
                  />
                </div>
                {formed && (
                  <p className="mt-2 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    ✓ Terbentuk
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-6 text-xs text-muted">
        Angka 66 hari adalah median dari penelitian Lally dkk. (2010); waktu tiap orang bisa berbeda (sekitar 18–254
        hari). Melewatkan satu hari tidak menggagalkan proses, jadi yang dihitung adalah total hari tercentang.
      </p>
    </div>
  );
}
