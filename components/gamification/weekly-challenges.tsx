import { CheckCircle2, Circle, Target } from "lucide-react";
import { diffDays } from "@/lib/dates";
import { formatDayLong } from "@/lib/format";
import { CHALLENGE_BONUS, challengeTitle, type WeeklyChallenge } from "@/lib/gamification";
import { colorDot } from "@/lib/habit-colors";

interface Props {
  challenges: (WeeklyChallenge & { done?: boolean })[];
  end: string;
  today: string;
  habitInfo: Record<string, { name: string; color: string }>;
}

const DESCRIPTIONS = {
  active: "Centang minimal satu kebiasaan setiap hari minggu ini.",
  perfect: "Selesaikan semua kebiasaan dalam satu hari.",
  focus: "Habit yang paling tertinggal minggu lalu. Yuk kejar!",
} as const;

/** FR-25: tiga tantangan minggu berjalan, masing-masing bernilai bonus XP. */
export function WeeklyChallenges({ challenges, end, today, habitInfo }: Props) {
  const daysLeft = diffDays(today, end);
  const completed = challenges.filter((c) => c.done ?? c.completedAt !== null).length;

  return (
    <section aria-labelledby="week-title" className="rounded-2xl border border-border bg-surface p-4 shadow-sm shadow-black/[0.02] sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-full bg-linear-to-b from-cyan-400 to-sky-600 text-white" aria-hidden>
            <Target className="size-5" />
          </span>
          <div>
            <h2 id="week-title" className="font-semibold">
              Tantangan minggu ini
            </h2>
            <p className="text-xs text-muted">
              Berakhir {formatDayLong(end)} · {daysLeft === 0 ? "hari terakhir" : `${daysLeft} hari lagi`}
            </p>
          </div>
        </div>
        <p className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium">
          {completed} dari {challenges.length} selesai · +{CHALLENGE_BONUS} XP per tantangan
        </p>
      </div>

      <ul className="grid gap-3">
        {challenges.map((c) => {
          const done = c.done ?? c.completedAt !== null;
          const focus = c.habitId ? habitInfo[c.habitId] : undefined;
          return (
            <li key={c.kind} className="flex items-start gap-3">
              {done ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden /> : <Circle className="mt-0.5 size-5 shrink-0 text-muted/60" aria-hidden />}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p className="flex items-center gap-1.5 font-medium">
                    {focus && <span className={`size-2.5 rounded-full ${colorDot(focus.color)}`} aria-hidden />}
                    {challengeTitle(c, focus?.name)}
                    {done && <span className="sr-only">(selesai)</span>}
                  </p>
                  <p className={`text-xs font-medium tabular-nums ${done ? "text-success" : "text-muted"}`}>
                    {done ? `Selesai · +${CHALLENGE_BONUS} XP` : `${c.progress} / ${c.target}`}
                  </p>
                </div>
                <p className="text-xs text-muted">{DESCRIPTIONS[c.kind]}</p>
                <div
                  className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2"
                  role="progressbar"
                  aria-label={`Progres ${challengeTitle(c, focus?.name)}`}
                  aria-valuemin={0}
                  aria-valuemax={c.target}
                  aria-valuenow={c.progress}
                >
                  <div className={`h-full rounded-full transition-[width] duration-300 ${done ? "bg-success" : "bg-accent"}`} style={{ width: `${(c.progress / c.target) * 100}%` }} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
