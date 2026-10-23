import { Suspense } from "react";
import { db } from "@/lib/db";
import { getToday } from "@/lib/services/settings-service";

export default function DashboardPage() {
  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">Hari Ini</h1>
      <Suspense fallback={<p className="mt-2 text-muted">Memuat…</p>}>
        <HabitSummary />
      </Suspense>
    </section>
  );
}

// Fase 1: hanya membuktikan pipeline DB → UI berjalan. Check-in sebenarnya dibuat di Fase 3.
async function HabitSummary() {
  const [today, habits] = await Promise.all([
    getToday(),
    db.habit.findMany({ where: { isActive: true }, orderBy: { orderIndex: "asc" } }),
  ]);

  return (
    <>
      <p className="mt-2 text-muted">
        {today} · {habits.length} habit aktif
      </p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {habits.map((habit) => (
          <li key={habit.id} className="rounded-xl border border-border bg-surface p-4">
            <p className="font-medium">{habit.name}</p>
            {habit.target && <p className="text-sm text-muted">{habit.target}</p>}
          </li>
        ))}
      </ul>
    </>
  );
}
