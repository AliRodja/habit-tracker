import { Archive, ChevronDown, ChevronUp, Pencil } from "lucide-react";
import type { Habit } from "@/lib/generated/prisma/client";
import { archiveHabit, reorderHabits, updateHabit } from "@/lib/actions/habit-actions";
import { colorDot } from "@/lib/habit-colors";
import { btnIcon, btnSecondary } from "@/components/ui/styles";
import { HabitForm } from "./habit-form";

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
    <li className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <span className={`mt-1.5 size-3 shrink-0 rounded-full ${colorDot(habit.color)}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{habit.name}</p>
          {habit.target && <p className="text-sm text-muted">Target: {habit.target}</p>}
          {habit.description && <p className="mt-1 text-sm text-muted">{habit.description}</p>}
          <p className="mt-1 text-xs text-muted">Mulai {habit.startDate}</p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <form action={reorderHabits.bind(null, isFirst ? orderedIds : swapped(orderedIds, index, index - 1))}>
            <button type="submit" className={btnIcon} disabled={isFirst} aria-label={`Naikkan ${habit.name}`}>
              <ChevronUp className="size-4" aria-hidden />
            </button>
          </form>
          <form action={reorderHabits.bind(null, isLast ? orderedIds : swapped(orderedIds, index, index + 1))}>
            <button type="submit" className={btnIcon} disabled={isLast} aria-label={`Turunkan ${habit.name}`}>
              <ChevronDown className="size-4" aria-hidden />
            </button>
          </form>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-start gap-2">
        <details className="group w-full order-last">
          <summary className={`${btnSecondary} w-fit cursor-pointer list-none`}>
            <Pencil className="size-4" aria-hidden /> Ubah
          </summary>
          <div className="mt-3 border-t border-border pt-4">
            <HabitForm
              idPrefix={`edit-${habit.id}`}
              action={updateHabit.bind(null, habit.id)}
              today={today}
              submitLabel="Simpan perubahan"
              defaults={{
                name: habit.name,
                target: habit.target ?? "",
                description: habit.description ?? "",
                color: habit.color,
                startDate: habit.startDate,
              }}
            />
          </div>
        </details>
        <form action={archiveHabit.bind(null, habit.id)}>
          <button type="submit" className={btnSecondary}>
            <Archive className="size-4" aria-hidden /> Nonaktifkan
          </button>
        </form>
      </div>
    </li>
  );
}
