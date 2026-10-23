import { Archive, ChevronDown, ChevronUp } from "lucide-react";
import { btnIcon, btnSecondary } from "@/components/ui/styles";
import { archiveHabit, reorderHabits, updateHabit } from "@/lib/actions/habit-actions";
import { formatDateShort } from "@/lib/format";
import type { Habit } from "@/lib/generated/prisma/client";
import { colorDot } from "@/lib/habit-colors";
import { EditHabitDialog } from "./habit-dialogs";

interface Props {
  habit: Habit;
  /** Id seluruh habit aktif sesuai urutan saat ini. */
  orderedIds: string[];
  today: string;
}

function swapped(ids: string[], from: number, to: number): string[] {
  const next = [...ids];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

export function HabitCard({ habit, orderedIds, today }: Props) {
  const index = orderedIds.indexOf(habit.id);
  const isFirst = index === 0;
  const isLast = index === orderedIds.length - 1;

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm shadow-black/[0.02] sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className={`mt-1.5 size-3 shrink-0 rounded-full ${colorDot(habit.color)}`} aria-hidden />
        <div className="min-w-0">
          <p className="font-semibold">{habit.name}</p>
          <p className="text-sm text-muted">
            {habit.target && <>Target: {habit.target} · </>}
            Mulai {formatDateShort(habit.startDate)}
          </p>
          {habit.description && <p className="mt-1 text-sm text-muted">{habit.description}</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 sm:shrink-0">
        <form action={reorderHabits.bind(null, isFirst ? orderedIds : swapped(orderedIds, index, index - 1))}>
          <button type="submit" className={btnIcon} disabled={isFirst} aria-label={`Naikkan ${habit.name}`} title="Pindah ke atas">
            <ChevronUp className="size-4" aria-hidden />
          </button>
        </form>
        <form action={reorderHabits.bind(null, isLast ? orderedIds : swapped(orderedIds, index, index + 1))}>
          <button type="submit" className={btnIcon} disabled={isLast} aria-label={`Turunkan ${habit.name}`} title="Pindah ke bawah">
            <ChevronDown className="size-4" aria-hidden />
          </button>
        </form>
        <EditHabitDialog
          habitId={habit.id}
          name={habit.name}
          action={updateHabit.bind(null, habit.id)}
          today={today}
          defaults={{ name: habit.name, target: habit.target ?? "", description: habit.description ?? "", color: habit.color, startDate: habit.startDate }}
        />
        <form action={archiveHabit.bind(null, habit.id)}>
          <button type="submit" className={btnSecondary} aria-label={`Arsipkan ${habit.name}`} title="Sembunyikan dari Hari Ini; riwayat tetap tersimpan">
            <Archive className="size-4" aria-hidden /> Arsipkan
          </button>
        </form>
      </div>
    </li>
  );
}
