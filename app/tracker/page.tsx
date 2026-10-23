import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Suspense } from "react";
import { TrackingGrid } from "@/components/tracker/tracking-grid";
import { YearSelect } from "@/components/tracker/year-select";
import { addMonths, formatYearMonth, monthBounds, parseYearMonth, yearBounds } from "@/lib/dates";
import { formatMonthName, formatMonthYear } from "@/lib/format";
import { buildGridRows } from "@/lib/grid";
import { listActiveHabits } from "@/lib/services/habit-service";
import { getRecordsBetween } from "@/lib/services/record-service";
import { getToday } from "@/lib/services/settings-service";
import { btnIcon, btnSecondary } from "@/components/ui/styles";

export const metadata: Metadata = { title: "Tracker" };

export default function TrackerPage({ searchParams }: PageProps<"/tracker">) {
  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">Tracker</h1>
      <Suspense fallback={<p className="mt-2 text-muted">Memuat…</p>}>
        <TrackerContent searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const monthHref = (year: number, month: number) => `/tracker?view=month&m=${formatYearMonth(year, month)}`;
const yearHref = (year: number) => `/tracker?view=year&y=${year}`;

async function TrackerContent({ searchParams }: { searchParams: PageProps<"/tracker">["searchParams"] }) {
  const params = await searchParams;
  const [today, habits] = await Promise.all([getToday(), listActiveHabits()]);
  const currentYear = Number(today.slice(0, 4));
  const minYear = Math.min(currentYear, ...habits.map((h) => Number(h.startDate.slice(0, 4))));
  const years = Array.from({ length: currentYear - minYear + 1 }, (_, i) => minYear + i);
  const clampYear = (year: number) => Math.min(currentYear, Math.max(minYear, year));

  const view = first(params.view) === "year" ? "year" : "month";
  const ym = parseYearMonth(first(params.m)) ?? { year: currentYear, month: Number(today.slice(5, 7)) };
  const month = { year: clampYear(ym.year), month: ym.year === clampYear(ym.year) ? ym.month : 1 };
  const yearParam = Number(first(params.y));
  const year = view === "year" ? clampYear(Number.isInteger(yearParam) && yearParam > 0 ? yearParam : currentYear) : month.year;

  if (habits.length === 0) {
    return (
      <p className="mt-6 text-muted">
        Belum ada habit aktif.{" "}
        <Link href="/habits" className="underline underline-offset-2">
          Tambahkan habit terlebih dahulu
        </Link>
        .
      </p>
    );
  }

  const gridHabits = habits.map((h) => ({ id: h.id, name: h.name, color: h.color }));
  const range = view === "year" ? yearBounds(year) : monthBounds(month.year, month.month);
  const records = await getRecordsBetween(range.from, range.to);

  const prev = addMonths(month.year, month.month, -1);
  const next = addMonths(month.year, month.month, 1);
  const hasPrev = prev.year >= minYear;
  const hasNext = next.year <= currentYear;

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Tampilan" className="flex rounded-lg border border-border bg-surface p-0.5 text-sm">
          <Link
            href={monthHref(month.year, month.month)}
            aria-current={view === "month" ? "page" : undefined}
            className={`rounded-md px-3 py-1 ${view === "month" ? "bg-foreground text-background" : "text-muted"}`}
          >
            Bulanan
          </Link>
          <Link
            href={yearHref(year)}
            aria-current={view === "year" ? "page" : undefined}
            className={`rounded-md px-3 py-1 ${view === "year" ? "bg-foreground text-background" : "text-muted"}`}
          >
            Tahunan
          </Link>
        </div>

        {view === "month" && (
          <div className="flex items-center gap-2">
            {hasPrev ? (
              <Link href={monthHref(prev.year, prev.month)} className={btnIcon} aria-label="Bulan sebelumnya">
                <ChevronLeft className="size-4" aria-hidden />
              </Link>
            ) : (
              <span className={`${btnIcon} opacity-50`} aria-hidden>
                <ChevronLeft className="size-4" />
              </span>
            )}
            <p className="min-w-36 text-center font-medium" aria-live="polite">
              {formatMonthYear(month.year, month.month)}
            </p>
            {hasNext ? (
              <Link href={monthHref(next.year, next.month)} className={btnIcon} aria-label="Bulan berikutnya">
                <ChevronRight className="size-4" aria-hidden />
              </Link>
            ) : (
              <span className={`${btnIcon} opacity-50`} aria-hidden>
                <ChevronRight className="size-4" />
              </span>
            )}
          </div>
        )}

        <YearSelect
          years={years}
          value={year}
          hrefs={Object.fromEntries(years.map((y) => [y, view === "year" ? yearHref(y) : monthHref(y, y === month.year ? month.month : 1)]))}
        />

        {view === "month" && (month.year !== currentYear || month.month !== Number(today.slice(5, 7))) && (
          <Link href={monthHref(currentYear, Number(today.slice(5, 7)))} className={btnSecondary}>
            Bulan ini
          </Link>
        )}
      </div>

      {view === "month" ? (
        <div className="mt-4">
          <TrackingGrid
            title={`Tracker ${formatMonthYear(month.year, month.month)}`}
            habits={gridHabits}
            rows={buildGridRows(habits, records, range.from, range.to, today)}
          />
        </div>
      ) : (
        <div className="mt-4 grid gap-6 xl:grid-cols-2">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
            const bounds = monthBounds(year, m);
            const rows = buildGridRows(habits, records.filter((r) => r.date >= bounds.from && r.date <= bounds.to), bounds.from, bounds.to, today);
            return (
              <div key={m}>
                <h2 className="mb-2 font-medium capitalize">{formatMonthName(m)}</h2>
                <TrackingGrid title={`Tracker ${formatMonthYear(year, m)}`} habits={gridHabits} rows={rows} compact />
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-xs text-muted">
        Klik sel untuk mencentang. Klik kanan, tombol <kbd>N</kbd>, atau tombol Menu untuk menambah catatan. Sel abu-abu
        berada di luar rentang habit atau di masa depan.
      </p>
    </div>
  );
}
