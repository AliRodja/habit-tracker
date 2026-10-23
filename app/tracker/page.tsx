import { CalendarDays, Keyboard } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { GridLegend } from "@/components/tracker/grid-legend";
import { TrackingGrid } from "@/components/tracker/tracking-grid";
import { YearSelect } from "@/components/tracker/year-select";
import { EmptyState } from "@/components/ui/empty-state";
import { Loading } from "@/components/ui/loading";
import { PageHeader } from "@/components/ui/page-header";
import { PeriodNav } from "@/components/ui/period-nav";
import { SegmentedNav } from "@/components/ui/segmented-nav";
import { btnPrimary, btnSecondary } from "@/components/ui/styles";
import { addMonths, formatYearMonth, monthBounds, parseYearMonth, yearBounds } from "@/lib/dates";
import { formatMonthName, formatMonthYear } from "@/lib/format";
import { buildGridRows } from "@/lib/grid";
import { firstParam, yearRange } from "@/lib/search-params";
import { listActiveHabits } from "@/lib/services/habit-service";
import { getRecordsBetween } from "@/lib/services/record-service";
import { getToday } from "@/lib/services/settings-service";

export const metadata: Metadata = { title: "Tracker" };

export default function TrackerPage({ searchParams }: PageProps<"/tracker">) {
  return (
    <>
      <PageHeader
        title="Tracker"
        description="Lihat dan isi catatan hari-hari sebelumnya dalam bentuk tabel. Klik kotak untuk mencentang atau membatalkan."
      />
      <Suspense fallback={<Loading />}>
        <TrackerContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const monthHref = (year: number, month: number) => `/tracker?view=month&m=${formatYearMonth(year, month)}`;
const yearHref = (year: number) => `/tracker?view=year&y=${year}`;

async function TrackerContent({ searchParams }: { searchParams: PageProps<"/tracker">["searchParams"] }) {
  const params = await searchParams;
  const [today, habits] = await Promise.all([getToday(), listActiveHabits()]);

  if (habits.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Belum ada habit untuk dilacak"
        description="Tambahkan habit terlebih dahulu, lalu kembali ke sini untuk melihat catatan per hari."
        action={
          <Link href="/habits?baru=1" className={btnPrimary}>
            Tambah habit
          </Link>
        }
      />
    );
  }

  const earliest = habits.reduce((min, h) => (h.startDate < min ? h.startDate : min), today);
  const { years, current, min, clamp } = yearRange(earliest, today);
  const currentMonth = Number(today.slice(5, 7));

  const view = firstParam(params.view) === "year" ? "year" : "month";
  const ym = parseYearMonth(firstParam(params.m)) ?? { year: current, month: currentMonth };
  const month = { year: clamp(ym.year), month: ym.year === clamp(ym.year) ? ym.month : 1 };
  const year = view === "year" ? clamp(Number(firstParam(params.y))) : month.year;

  const gridHabits = habits.map((h) => ({ id: h.id, name: h.name, color: h.color }));
  const range = view === "year" ? yearBounds(year) : monthBounds(month.year, month.month);
  const records = await getRecordsBetween(range.from, range.to);

  const prev = addMonths(month.year, month.month, -1);
  const next = addMonths(month.year, month.month, 1);
  const isCurrentMonth = month.year === current && month.month === currentMonth;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedNav
          label="Tampilan"
          items={[
            { href: monthHref(month.year, month.month), label: "Bulanan", active: view === "month" },
            { href: yearHref(year), label: "Tahunan", active: view === "year" },
          ]}
        />
        {view === "month" && (
          <PeriodNav
            label={formatMonthYear(month.year, month.month)}
            previous={prev.year >= min ? { href: monthHref(prev.year, prev.month), label: "Bulan sebelumnya" } : null}
            next={next.year <= current ? { href: monthHref(next.year, next.month), label: "Bulan berikutnya" } : null}
          />
        )}
        <YearSelect
          years={years}
          value={year}
          hrefs={Object.fromEntries(years.map((y) => [y, view === "year" ? yearHref(y) : monthHref(y, y === month.year ? month.month : 1)]))}
        />
        {view === "month" && !isCurrentMonth && (
          <Link href={monthHref(current, currentMonth)} className={btnSecondary}>
            Kembali ke bulan ini
          </Link>
        )}
      </div>

      <GridLegend />

      {view === "month" ? (
        <TrackingGrid
          title={`Tracker ${formatMonthYear(month.year, month.month)}`}
          habits={gridHabits}
          rows={buildGridRows(habits, records, range.from, range.to, today)}
        />
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-2">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
            const bounds = monthBounds(year, m);
            const rows = buildGridRows(habits, records.filter((r) => r.date >= bounds.from && r.date <= bounds.to), bounds.from, bounds.to, today);
            return (
              <div key={m} className="min-w-0">
                <h2 className="mb-2 font-semibold capitalize">{formatMonthName(m)}</h2>
                <TrackingGrid title={`Tracker ${formatMonthYear(year, m)}`} habits={gridHabits} rows={rows} compact />
              </div>
            );
          })}
        </div>
      )}

      <details className="rounded-2xl border border-border bg-surface p-4 text-sm">
        <summary className="flex cursor-pointer list-none items-center gap-2 font-medium">
          <Keyboard className="size-4 text-accent-text" aria-hidden /> Tips: catatan dan pintasan keyboard
        </summary>
        <ul className="mt-3 grid gap-1.5 text-muted">
          <li>Klik kanan sebuah kotak (atau pilih lalu tekan N) untuk menulis catatan harian.</li>
          <li>Tombol panah memindahkan pilihan antar kotak; Home dan End melompat ke kolom pertama atau terakhir.</li>
          <li>Spasi atau Enter mencentang dan membatalkan centang.</li>
        </ul>
      </details>
    </div>
  );
}
