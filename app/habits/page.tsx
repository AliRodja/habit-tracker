import { Archive, ListChecks } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ArchivedHabitRow } from "@/components/habits/archived-habit-row";
import { HabitCard } from "@/components/habits/habit-card";
import { AddHabitDialog } from "@/components/habits/habit-dialogs";
import { EmptyState } from "@/components/ui/empty-state";
import { Loading } from "@/components/ui/loading";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { createHabit } from "@/lib/actions/habit-actions";
import { firstParam } from "@/lib/search-params";
import { listActiveHabits, listArchivedHabits } from "@/lib/services/habit-service";
import { getToday } from "@/lib/services/settings-service";
import { getActiveHabitLimit } from "@/lib/services/settings-store";

export const metadata: Metadata = { title: "Habit" };

export default function HabitsPage({ searchParams }: PageProps<"/habits">) {
  return (
    <Suspense
      fallback={
        <>
          <PageHeader title="Habit" description="Atur kebiasaan yang ingin Anda bangun." />
          <Loading />
        </>
      }
    >
      <HabitsContent searchParams={searchParams} />
    </Suspense>
  );
}

/** Indikator slot: berapa dari batas habit aktif yang terpakai. */
function SlotMeter({ used, limit }: { used: number; limit: number }) {
  return (
    <div className="flex items-center gap-3 text-sm text-muted">
      <span className="flex gap-1" aria-hidden>
        {Array.from({ length: limit }, (_, i) => (
          <span key={i} className={`h-2 w-5 rounded-full ${i < used ? "bg-accent" : "bg-surface-2"}`} />
        ))}
      </span>
      {used} dari {limit} habit aktif
    </div>
  );
}

async function HabitsContent({ searchParams }: { searchParams: PageProps<"/habits">["searchParams"] }) {
  const [params, today, active, archived, limit] = await Promise.all([
    searchParams,
    getToday(),
    listActiveHabits(),
    listArchivedHabits(),
    getActiveHabitLimit(),
  ]);
  const full = active.length >= limit;
  const orderedIds = active.map((h) => h.id);
  const addDialog = <AddHabitDialog action={createHabit} today={today} defaultOpen={!full && firstParam(params.baru) === "1"} />;

  return (
    <>
      <PageHeader
        title="Habit"
        description="Atur kebiasaan yang ingin Anda bangun. Habit yang sedikit tetapi konsisten lebih bermanfaat daripada banyak tetapi terbengkalai."
        actions={full || active.length === 0 ? undefined : addDialog}
      >
        <SlotMeter used={active.length} limit={limit} />
      </PageHeader>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-10">
        <section aria-labelledby="active-title">
          <h2 id="active-title" className="sr-only">
            Habit Aktif
          </h2>
          {full && (
            <Notice className="mb-4">
              Semua {limit} slot sedang terpakai. Arsipkan salah satu habit untuk menambah yang baru, atau{" "}
              <Link href="/settings#umum" className="font-medium text-accent-text underline underline-offset-2">
                naikkan batasnya di Pengaturan
              </Link>
              .
            </Notice>
          )}
          {active.length === 0 ? (
            <EmptyState
              icon={ListChecks}
              title="Belum ada habit aktif"
              description={`Mulai dengan satu kebiasaan kecil. Anda bisa menambah hingga ${limit} habit aktif.`}
              action={addDialog}
            />
          ) : (
            <ul className="grid gap-3">
              {active.map((habit) => (
                <HabitCard key={habit.id} habit={habit} orderedIds={orderedIds} today={today} />
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="archive-title">
          <div className="mb-3 flex items-center gap-2">
            <Archive className="size-4 text-muted" aria-hidden />
            <h2 id="archive-title" className="text-base font-semibold">
              Arsip
            </h2>
          </div>
          <p className="mb-4 max-w-2xl text-sm text-muted">
            Habit di arsip tidak muncul di Hari Ini dan Tracker, tetapi riwayatnya tetap dihitung di laporan. Aktifkan kembali kapan saja.
          </p>
          {archived.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted">Tidak ada habit di arsip.</p>
          ) : (
            <ul className="grid gap-3">
              {archived.map((habit) => (
                <ArchivedHabitRow key={habit.id} habit={habit} canRestore={!full} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
