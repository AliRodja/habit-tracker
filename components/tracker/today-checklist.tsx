"use client";

import { Check, Flame, Shield, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useOptimistic, useState, useTransition } from "react";
import { FlameBadge } from "@/components/gamification/flame-badge";
import { Notice } from "@/components/ui/notice";
import { setRecord } from "@/lib/actions/record-actions";
import { formatDayLong, formatPercent } from "@/lib/format";
import { dayXp, flameTier, levelFromXp, PERFECT_DAY_BONUS, SHIELD_MAX, XP_PER_CHECK, type GamificationSummary } from "@/lib/gamification";
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
    <svg viewBox="0 0 64 64" className="size-14 shrink-0 -rotate-90" aria-hidden>
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

interface Props {
  items: TodayItem[];
  today: string;
  game: GamificationSummary;
}

export function TodayChecklist({ items, today, game }: Props) {
  const serverChecked: Checked = Object.fromEntries(items.map((item) => [item.habit.id, item.checkedToday]));
  const [checked, setChecked] = useOptimistic<Checked, { id: string; value: boolean }>(
    serverChecked,
    (state, { id, value }) => ({ ...state, [id]: value }),
  );
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  /** Hadiah instan: "+XP" yang melayang dari kartu, dan pesan perayaan di panel api. */
  const [gain, setGain] = useState<{ id: string; xp: number; key: number } | null>(null);
  const [celebration, setCelebration] = useState<{ text: string; key: number } | null>(null);

  const done = items.filter((item) => checked[item.habit.id]).length;
  const ratio = items.length === 0 ? null : done / items.length;

  // Api, XP, dan level dihitung dari status optimistik, sehingga berubah seketika saat mencentang.
  const flame = done > 0 ? game.todayVariants.lit : game.todayVariants.unlit;
  const tier = flameTier(flame.streak);
  const xpToday = dayXp(done, items.length);
  const level = levelFromXp(game.xp.beforeToday + xpToday);

  useEffect(() => {
    if (!celebration) return;
    const timer = setTimeout(() => setCelebration(null), 4500);
    return () => clearTimeout(timer);
  }, [celebration]);

  function toggle(id: string) {
    const next = !checked[id];
    if (next) {
      const nextDone = done + 1;
      const perfect = nextDone === items.length;
      // `key` bertambah setiap kali agar animasi diputar ulang walau kartu yang sama dicentang lagi.
      setGain((prev) => ({ id, xp: XP_PER_CHECK + (perfect ? PERFECT_DAY_BONUS : 0), key: (prev?.key ?? 0) + 1 }));
      const text = perfect
        ? `🎉 Hari Sempurna! Bonus +${PERFECT_DAY_BONUS} XP`
        : done === 0
          ? `🔥 Api menyala! ${game.todayVariants.lit.streak} hari beruntun`
          : null;
      if (text) setCelebration((prev) => ({ text, key: (prev?.key ?? 0) + 1 }));
    } else {
      setGain(null);
    }

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

  const daysToNext = tier.next ? tier.next.min - flame.streak : 0;

  return (
    <div className="grid gap-4">
      <section
        aria-labelledby="api-title"
        className={`rounded-2xl border p-4 shadow-sm shadow-black/[0.02] transition-colors sm:p-5 ${
          flame.litToday ? "border-orange-300/60 bg-linear-to-br from-orange-50 to-surface dark:border-orange-500/30 dark:from-orange-500/10" : "border-border bg-surface"
        }`}
      >
        <div className="flex items-center gap-4">
          <FlameBadge streak={flame.streak} lit={flame.litToday} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted">{formatDayLong(today)}</p>
            <h2 id="api-title" className="text-xl font-bold tracking-tight sm:text-2xl">
              {flame.streak > 0 ? `${flame.streak} hari beruntun` : "Api belum menyala"}
            </h2>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold">Tingkat: {tier.name}</span>
              <span className="text-muted">
                {flame.litToday ? "Api hari ini sudah menyala." : "Centang satu kebiasaan agar api tetap menyala."}
              </span>
            </p>
          </div>
          <Link href="/pencapaian" className="hidden shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-accent-text hover:bg-accent-soft sm:flex">
            <Trophy className="size-4" aria-hidden /> Pencapaian
          </Link>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl bg-surface/70 p-3 dark:bg-surface-2/50">
            <div className="relative">
              <ProgressRing ratio={ratio ?? 0} />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold tabular-nums">{formatPercent(ratio)}</span>
            </div>
            <div className="min-w-0">
              <p className="font-semibold">
                {done} dari {items.length} selesai
              </p>
              <p className="text-xs text-muted">{encouragement(done, items.length)}</p>
            </div>
          </div>

          <div className="rounded-xl bg-surface/70 p-3 dark:bg-surface-2/50">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-semibold">Level {level.level}</p>
              <p className="text-xs text-muted tabular-nums">+{xpToday} XP hari ini</p>
            </div>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2"
              role="progressbar"
              aria-label={`Menuju level ${level.level + 1}`}
              aria-valuemin={0}
              aria-valuemax={level.needed}
              aria-valuenow={level.current}
            >
              <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${(level.current / level.needed) * 100}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-muted tabular-nums">
              {level.current} / {level.needed} XP menuju level {level.level + 1}
            </p>
          </div>

          <div className="rounded-xl bg-surface/70 p-3 dark:bg-surface-2/50">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">Pelindung api</p>
              <span className="flex gap-1" aria-hidden>
                {Array.from({ length: SHIELD_MAX }, (_, i) => (
                  <Shield key={i} className={`size-4 ${i < flame.shields ? "fill-sky-500 text-sky-600" : "text-muted/50"}`} />
                ))}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted">
              {flame.shields} dari {SHIELD_MAX} tersimpan. Menjaga api bila satu hari terlewat.
            </p>
            {tier.next && (
              <p className="mt-1 text-xs font-medium">
                {daysToNext} hari lagi menuju tingkat {tier.next.name}
              </p>
            )}
          </div>
        </div>

        <p role="status" aria-live="polite" className="min-h-0">
          {celebration && (
            <span key={celebration.key} className="mt-3 flex w-fit animate-[pop-in_0.25s_ease-out] items-center gap-2 rounded-full bg-foreground px-3.5 py-1.5 text-sm font-semibold text-background">
              {celebration.text}
            </span>
          )}
        </p>
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
                className={`group relative flex h-full w-full items-start gap-4 rounded-2xl border p-4 text-left shadow-sm shadow-black/[0.02] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  isChecked ? "border-success/40 bg-success-soft" : "border-border bg-surface hover:border-accent/50"
                }`}
              >
                {gain?.id === id && isChecked && (
                  <span
                    key={gain.key}
                    aria-hidden
                    className="pointer-events-none absolute top-2 right-3 animate-[float-up_1.1s_ease-out_forwards] text-sm font-bold text-orange-600 dark:text-orange-400"
                  >
                    +{gain.xp} XP
                  </span>
                )}
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

                  {/* Nama aksesibel = nama + target yang terlihat; streak/progres menjadi deskripsi (WCAG 2.5.3). */}
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
                    {formed && <span className="mt-2 inline-flex rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-success">✓ Terbentuk</span>}
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
