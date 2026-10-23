import { ArchiveRestore } from "lucide-react";
import { btnSecondary } from "@/components/ui/styles";
import { deleteHabit, restoreHabit } from "@/lib/actions/habit-actions";
import { formatDateShort } from "@/lib/format";
import type { Habit } from "@/lib/generated/prisma/client";
import { colorDot } from "@/lib/habit-colors";
import { DeleteHabitDialog } from "./delete-habit-dialog";

interface Props {
  habit: Habit;
  canRestore: boolean;
}

export function ArchivedHabitRow({ habit, canRestore }: Props) {
  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className={`mt-1.5 size-3 shrink-0 rounded-full ${colorDot(habit.color)} opacity-50`} aria-hidden />
        <div className="min-w-0">
          <p className="font-semibold">{habit.name}</p>
          <p className="text-sm text-muted">
            {formatDateShort(habit.startDate)} – diarsipkan {habit.archivedAt ? formatDateShort(habit.archivedAt) : ""}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <form action={restoreHabit.bind(null, habit.id)}>
          <button
            type="submit"
            className={btnSecondary}
            disabled={!canRestore}
            aria-label={`Aktifkan kembali ${habit.name}`}
            title={canRestore ? "Tampilkan lagi di Hari Ini" : "Semua slot habit aktif sedang terpakai"}
          >
            <ArchiveRestore className="size-4" aria-hidden /> Aktifkan kembali
          </button>
        </form>
        <DeleteHabitDialog habitName={habit.name} action={deleteHabit.bind(null, habit.id)} />
      </div>
    </li>
  );
}
