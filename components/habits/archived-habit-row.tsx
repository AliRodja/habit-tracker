import { ArchiveRestore } from "lucide-react";
import type { Habit } from "@/lib/generated/prisma/client";
import { deleteHabit, restoreHabit } from "@/lib/actions/habit-actions";
import { colorDot } from "@/lib/habit-colors";
import { btnSecondary } from "@/components/ui/styles";
import { DeleteHabitDialog } from "./delete-habit-dialog";

interface Props {
  habit: Habit;
  canRestore: boolean;
}

export function ArchivedHabitRow({ habit, canRestore }: Props) {
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-4">
      <span className={`size-3 shrink-0 rounded-full ${colorDot(habit.color)} opacity-60`} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{habit.name}</p>
        <p className="text-xs text-muted">
          {habit.startDate} → dinonaktifkan {habit.archivedAt}
        </p>
      </div>
      <form action={restoreHabit.bind(null, habit.id)}>
        <button
          type="submit"
          className={btnSecondary}
          disabled={!canRestore}
          title={canRestore ? undefined : "Batas 5 habit aktif tercapai"}
        >
          <ArchiveRestore className="size-4" aria-hidden /> Aktifkan kembali
        </button>
      </form>
      <DeleteHabitDialog habitName={habit.name} action={deleteHabit.bind(null, habit.id)} />
    </li>
  );
}
