import type { Metadata } from "next";
import { Suspense } from "react";
import { ArchivedHabitRow } from "@/components/habits/archived-habit-row";
import { HabitCard } from "@/components/habits/habit-card";
import { HabitForm } from "@/components/habits/habit-form";
import { createHabit } from "@/lib/actions/habit-actions";
import { MAX_ACTIVE_HABITS } from "@/lib/constants";
import { listActiveHabits, listArchivedHabits } from "@/lib/services/habit-service";
import { getToday } from "@/lib/services/settings-service";

export const metadata: Metadata = { title: "Habit" };

export default function HabitsPage() {
  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">Habit</h1>
      <Suspense fallback={<p className="mt-2 text-muted">Memuat…</p>}>
        <HabitsContent />
      </Suspense>
    </section>
  );
}

async function HabitsContent() {
  const [today, active, archived] = await Promise.all([getToday(), listActiveHabits(), listArchivedHabits()]);
  const full = active.length >= MAX_ACTIVE_HABITS;
  const orderedIds = active.map((h) => h.id);

  return (
    <div className="mt-6 grid gap-10">
      <section aria-labelledby="add-title">
        <h2 id="add-title" className="text-lg font-semibold">
          Tambah Habit
        </h2>
        <p className="mb-4 text-sm text-muted">
          {active.length} dari {MAX_ACTIVE_HABITS} habit aktif
        </p>
        <div className="rounded-xl border border-border bg-surface p-4">
          <HabitForm
            idPrefix="new"
            action={createHabit}
            today={today}
            submitLabel="Tambah Habit"
            disabledReason={full ? "Batas habit aktif tercapai. Nonaktifkan salah satu untuk menambah yang baru." : undefined}
            defaults={{ name: "", target: "", description: "", color: "emerald", startDate: today }}
          />
        </div>
      </section>

      <section aria-labelledby="active-title">
        <h2 id="active-title" className="mb-4 text-lg font-semibold">
          Habit Aktif
        </h2>
        {active.length === 0 ? (
          <p className="text-muted">Belum ada habit aktif. Tambahkan habit pertama Anda di atas.</p>
        ) : (
          <ul className="grid gap-3">
            {active.map((habit) => (
              <HabitCard key={habit.id} habit={habit} orderedIds={orderedIds} today={today} />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="archive-title">
        <h2 id="archive-title" className="mb-4 text-lg font-semibold">
          Arsip
        </h2>
        {archived.length === 0 ? (
          <p className="text-muted">Tidak ada habit di arsip.</p>
        ) : (
          <ul className="grid gap-3">
            {archived.map((habit) => (
              <ArchivedHabitRow key={habit.id} habit={habit} canRestore={!full} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
