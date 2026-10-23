"use client";

import { Check, Flame } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { Notice } from "@/components/ui/notice";
import { setRecord } from "@/lib/actions/record-actions";
import { formatDayLong, formatPercent } from "@/lib/format";
import { colorDot } from "@/lib/habit-colors";
import type { TodayItem } from "@/lib/services/dashboard-service";

type Checked = Record<string, boolean>;

function encouragement(done: number, total: number): string {
  if (done === 0) return "Mulai dari satu kebiasaan dulu. Sedikit tetap berarti.";
  if (done < total) return `Bagus! Tinggal ${total - done} lagi untuk hari ini.`;
  return "Sempurna! Semua kebiasaan hari ini sudah selesai. 🎉";
}

/** Lingkaran progres harian; angka persentase ditampilkan sebagai teks terpisah agar terbaca semua orang. */
function ProgressRing({ ratio }: { ratio: number }) {
  const r = 26;
  const circumference = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 64 64" className="size-16 shrink-0 -rotate-90" aria-hidden>
      <circle cx="32" cy="32" r={r} fill="none" strokeWidth="7" className="stroke-surface-2" />
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        strokeWidth="7"
        strokeLinecap="round"
        className="stroke-accent transition-[stroke-dashoffset] duration-300"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - ratio)}
      />
    </svg>
  );
}

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
    <div className="grid gap-4">
      <section aria-label="Ringkasan hari ini" className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm shadow-black/[0.02] sm:p-5">
        <div className="relative">
          <ProgressRing ratio={ratio ?? 0} />
          <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums">{formatPercent(ratio)}</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted">{formatDayLong(today)}</p>
          <p className="text-lg font-semibold">
            {done} dari {items.length} selesai
          </p>
          <p className="text-sm text-muted" aria-live="polite">
            {encouragement(done, items.length)}
          </p>
        </div>
      </section>

      <div role="alert">{error && <Notice tone="danger">{error}</Notice>}</div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const id = item.habit.id;
          const isChecked = checked[id];
          const streak = isChecked ? item.streak.ifChecked : item.streak.ifUnchecked;
          const days = isChecked ? item.completedDays.ifChecked : item.completedDays.ifUnchecked;
          const formed = days >= item.milestoneTarget;

          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => toggle(id)}
                aria-pressed={isChecked}
                aria-describedby={`${id}-meta`}
                className={`group flex h-full w-full items-start gap-4 rounded-2xl border p-4 text-left shadow-sm shadow-black/[0.02] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  isChecked ? "border-success/40 bg-success-soft" : "border-border bg-surface hover:border-accent/50"
                }`}
              >
                <span
                  className={`flex size-11 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    isChecked ? `${colorDot(item.habit.color)} border-transparent text-white` : "border-border text-transparent group-hover:text-muted/60"
                  }`}
                  aria-hidden
                >
                  <Check className="size-6" strokeWidth={3} />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="font-semibold">{item.habit.name}</span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${isChecked ? "bg-surface text-success" : "bg-surface-2 text-muted"}`}
                      aria-hidden
                    >
                      {isChecked ? "Selesai" : "Belum"}
                    </span>
                  </span>
                  {item.habit.target && <span className="block text-sm text-muted">Target: {item.habit.target}</span>}

                  <span id={`${id}-meta`} aria-hidden className="mt-3 block">
                    <span className="flex items-center gap-1.5 text-sm">
                      <Flame className={`size-4 ${streak > 0 ? "text-orange-500" : "text-muted"}`} aria-hidden />
                      {streak > 0 ? `${streak} hari beruntun` : "Belum ada hari beruntun"}
                    </span>
                    <span className="mt-2 flex items-center justify-between text-xs text-muted">
                      <span>Menuju kebiasaan terbentuk</span>
                      <span className="tabular-nums">
                        {Math.min(days, item.milestoneTarget)} / {item.milestoneTarget} hari
                      </span>
                    </span>
                    <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <span
                        className={`block h-full rounded-full ${colorDot(item.habit.color)}`}
                        style={{ width: `${Math.min(100, (days / item.milestoneTarget) * 100)}%` }}
                      />
                    </span>
                    {formed && (
                      <span className="mt-2 inline-flex rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-success">✓ Terbentuk</span>
                    )}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
