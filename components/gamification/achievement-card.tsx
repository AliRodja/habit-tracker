import { Award, CalendarCheck, CheckCheck, Flame, Lock, Sparkles, Sprout, Star, Target, type LucideIcon } from "lucide-react";
import { formatDateShort } from "@/lib/format";
import type { AchievementGroup, AchievementStatus } from "@/lib/gamification";

const GROUP_STYLE: Record<AchievementGroup, { icon: LucideIcon; gradient: string }> = {
  start: { icon: Sparkles, gradient: "from-sky-400 to-blue-600" },
  flame: { icon: Flame, gradient: "from-amber-400 to-orange-600" },
  perfect: { icon: Star, gradient: "from-yellow-400 to-amber-600" },
  active: { icon: CalendarCheck, gradient: "from-teal-400 to-emerald-600" },
  formed: { icon: Sprout, gradient: "from-lime-400 to-green-600" },
  checks: { icon: CheckCheck, gradient: "from-indigo-400 to-violet-600" },
  level: { icon: Award, gradient: "from-pink-400 to-rose-600" },
  challenge: { icon: Target, gradient: "from-cyan-400 to-sky-600" },
};

export function AchievementCard({ achievement }: { achievement: AchievementStatus }) {
  const { icon: Icon, gradient } = GROUP_STYLE[achievement.group];
  const unlocked = achievement.unlockedAt !== null;

  return (
    <li className={`flex gap-3 rounded-2xl border p-4 ${unlocked ? "border-border bg-surface shadow-sm shadow-black/[0.02]" : "border-dashed border-border bg-surface/60"}`}>
      <span
        aria-hidden
        className={`relative flex size-12 shrink-0 items-center justify-center rounded-full ${unlocked ? `bg-linear-to-b ${gradient} text-white shadow-sm` : "bg-surface-2 text-muted"}`}
      >
        <Icon className="size-6" />
        {!unlocked && (
          <span className="absolute -right-0.5 -bottom-0.5 flex size-5 items-center justify-center rounded-full border border-border bg-surface">
            <Lock className="size-3" />
          </span>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{achievement.title}</p>
        <p className="text-sm text-muted">{achievement.description}</p>
        {unlocked ? (
          <p className="mt-1.5 text-xs font-medium text-success">Terbuka {formatDateShort(achievement.unlockedAt!)}</p>
        ) : (
          <div className="mt-2">
            <div
              className="h-1.5 overflow-hidden rounded-full bg-surface-2"
              role="progressbar"
              aria-label={`Progres ${achievement.title}`}
              aria-valuemin={0}
              aria-valuemax={achievement.target}
              aria-valuenow={achievement.progress}
            >
              <div className="h-full rounded-full bg-accent" style={{ width: `${(achievement.progress / achievement.target) * 100}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted tabular-nums">
              {achievement.progress.toLocaleString("id-ID")} / {achievement.target.toLocaleString("id-ID")}
            </p>
          </div>
        )}
      </div>
    </li>
  );
}
