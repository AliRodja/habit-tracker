import { Medal } from "lucide-react";
import { formatDateShort } from "@/lib/format";
import { HABIT_MEDALS, type HabitBadges } from "@/lib/gamification";
import { colorDot } from "@/lib/habit-colors";

const MEDAL_STYLE: Record<string, string> = {
  Perunggu: "from-orange-300 to-amber-700",
  Perak: "from-slate-200 to-slate-500",
  Emas: "from-yellow-300 to-amber-500",
  Berlian: "from-cyan-200 to-sky-500",
};

/** FR-26: medali per habit menurut total hari tercentang. */
export function HabitMedals({ badges, name, color, archived }: { badges: HabitBadges; name: string; color: string; archived: boolean }) {
  const earnedNames = new Set(badges.earned.map((e) => e.name));
  const next = badges.next;
  const previous = [...HABIT_MEDALS].reverse().find((m) => m.days <= badges.completedDays)?.days ?? 0;

  return (
    <li className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-semibold">
          <span className={`size-2.5 rounded-full ${colorDot(color)}`} aria-hidden />
          {name}
          {archived && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-normal text-muted">Arsip</span>}
        </p>
        <p className="text-sm text-muted tabular-nums">{badges.completedDays} hari tercentang</p>
      </div>

      <ul className="mt-3 flex flex-wrap gap-2" aria-label={`Medali ${name}`}>
        {HABIT_MEDALS.map((medal) => {
          const earned = badges.earned.find((e) => e.name === medal.name);
          return (
            <li
              key={medal.name}
              className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-sm ${earned ? "border-border bg-surface" : "border-dashed border-border text-muted"}`}
              title={earned ? `Diraih ${formatDateShort(earned.date)}` : `Butuh ${medal.days} hari tercentang`}
            >
              <span
                aria-hidden
                className={`flex size-6 items-center justify-center rounded-full ${earnedNames.has(medal.name) ? `bg-linear-to-b ${MEDAL_STYLE[medal.name]} text-white` : "bg-surface-2"}`}
              >
                <Medal className="size-3.5" />
              </span>
              <span>
                {medal.name} <span className="text-xs text-muted">· {medal.days} hari</span>
                <span className="sr-only">{earned ? `, diraih ${formatDateShort(earned.date)}` : ", belum diraih"}</span>
              </span>
            </li>
          );
        })}
      </ul>

      {next ? (
        <div className="mt-3">
          <div
            className="h-1.5 overflow-hidden rounded-full bg-surface-2"
            role="progressbar"
            aria-label={`Menuju medali ${next.name} untuk ${name}`}
            aria-valuemin={previous}
            aria-valuemax={next.days}
            aria-valuenow={badges.completedDays}
          >
            <div className="h-full rounded-full bg-accent" style={{ width: `${((badges.completedDays - previous) / (next.days - previous)) * 100}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted">
            {next.days - badges.completedDays} hari lagi menuju medali {next.name}
          </p>
        </div>
      ) : (
        <p className="mt-3 text-xs font-medium text-success">Semua medali sudah diraih. Luar biasa!</p>
      )}
    </li>
  );
}
