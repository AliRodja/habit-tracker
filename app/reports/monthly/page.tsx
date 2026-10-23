import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ReportBarChart, type BarDatum } from "@/components/reports/bar-chart";
import { DataTable } from "@/components/reports/data-table";
import { HabitStatsTable } from "@/components/reports/habit-stats-table";
import { StatTile } from "@/components/reports/stat-tile";
import { YearSelect } from "@/components/tracker/year-select";
import { formatYearMonth, parseYearMonth } from "@/lib/dates";
import { formatMonthName, formatMonthYear, formatPercent } from "@/lib/format";
import { getEarliestStartDate, getMonthlyReport } from "@/lib/services/report-service";
import { getToday } from "@/lib/services/settings-service";

export const metadata: Metadata = { title: "Laporan Bulanan" };

export default function MonthlyReportPage({ searchParams }: PageProps<"/reports/monthly">) {
  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">Laporan Bulanan</h1>
      <Suspense fallback={<p className="mt-2 text-muted">Memuat…</p>}>
        <MonthlyContent searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const href = (year: number, month: number) => `/reports/monthly?m=${formatYearMonth(year, month)}`;

async function MonthlyContent({ searchParams }: { searchParams: PageProps<"/reports/monthly">["searchParams"] }) {
  const params = await searchParams;
  const today = await getToday();
  const currentYear = Number(today.slice(0, 4));
  const earliest = await getEarliestStartDate();
  const minYear = Math.min(currentYear, earliest ? Number(earliest.slice(0, 4)) : currentYear);
  const years = Array.from({ length: currentYear - minYear + 1 }, (_, i) => minYear + i);

  const requested = parseYearMonth(first(params.m)) ?? { year: currentYear, month: Number(today.slice(5, 7)) };
  const year = Math.min(currentYear, Math.max(minYear, requested.year));
  const month = year === requested.year ? requested.month : 1;

  const report = await getMonthlyReport(year, month, today);
  const { summary } = report;

  const monthData: BarDatum[] = report.months.map((m) => ({
    label: formatMonthName(m.month).slice(0, 3),
    value: m.rate === null ? null : m.rate * 100,
    highlight: m.month === month,
    detail: m.eligible === 0 ? "Tidak ada habit-hari" : `${m.checked} dari ${m.eligible} habit-hari`,
  }));
  const habitData: BarDatum[] = report.habits.map((h) => ({
    label: h.name,
    value: h.rate === null ? null : h.rate * 100,
    highlight: true,
    detail: `${h.checked} dari ${h.eligible} hari`,
  }));

  return (
    <div className="mt-4 grid gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <YearSelect years={years} value={year} hrefs={Object.fromEntries(years.map((y) => [y, href(y, y === year ? month : 1)]))} />
        <nav aria-label="Pilih bulan" className="flex flex-wrap gap-1">
          {report.months.map((m) => (
            <Link
              key={m.month}
              href={href(year, m.month)}
              aria-current={m.month === month ? "page" : undefined}
              className={`rounded-md border px-2.5 py-1 text-sm capitalize ${m.month === month ? "border-foreground bg-foreground text-background" : "border-border bg-surface text-muted hover:text-foreground"}`}
            >
              {formatMonthName(m.month).slice(0, 3)}
            </Link>
          ))}
        </nav>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatTile label={`Tingkat ${formatMonthYear(year, month)}`} value={formatPercent(summary.rate)} note={`${summary.checked} dari ${summary.eligible} habit-hari`} />
        <StatTile label="Hari sempurna" value={String(summary.perfectDays)} />
        <StatTile label="Hari aktif" value={String(summary.activeDays)} />
        <StatTile label="Habit terbaik" value={report.best ? report.best.name : "–"} note={report.best ? `${formatPercent(report.best.rate)} · ${report.best.checked}/${report.best.eligible}` : "Belum ada data"} />
        <StatTile label="Perlu perhatian" value={report.needsAttention ? report.needsAttention.name : "–"} note={report.needsAttention ? `${formatPercent(report.needsAttention.rate)} · ${report.needsAttention.checked}/${report.needsAttention.eligible}` : "Semua habit sejalan"} />
      </div>

      <section aria-labelledby="year-title" className="rounded-xl border border-border bg-surface p-4">
        <h2 id="year-title" className="font-semibold">Tingkat penyelesaian per bulan, {year}</h2>
        <p className="mb-2 text-sm text-muted">Bulan tanpa habit-hari ditampilkan kosong, bukan 0%.</p>
        <ReportBarChart data={monthData} ariaLabel={`Grafik batang tingkat penyelesaian per bulan tahun ${year}`} />
        <DataTable
          caption={`Tingkat penyelesaian per bulan ${year}`}
          head={["Bulan", "Selesai", "Tingkat"]}
          rows={report.months.map((m) => [formatMonthName(m.month), m.eligible === 0 ? "–" : `${m.checked}/${m.eligible}`, formatPercent(m.rate)])}
        />
      </section>

      <section aria-labelledby="dist-title" className="rounded-xl border border-border bg-surface p-4">
        <h2 id="dist-title" className="font-semibold">Distribusi per habit, {formatMonthYear(year, month)}</h2>
        {habitData.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Belum ada habit pada bulan ini.</p>
        ) : (
          <>
            <ReportBarChart data={habitData} orientation="horizontal" height={Math.max(120, habitData.length * 44 + 40)} ariaLabel="Grafik batang tingkat penyelesaian per habit" />
            <DataTable
              caption="Tingkat penyelesaian per habit"
              head={["Habit", "Selesai", "Tingkat"]}
              rows={report.habits.map((h) => [h.name, `${h.checked}/${h.eligible}`, formatPercent(h.rate)])}
            />
          </>
        )}
      </section>

      <section aria-labelledby="habit-title">
        <h2 id="habit-title" className="mb-3 font-semibold">Per habit</h2>
        <HabitStatsTable rows={report.habits} />
      </section>
    </div>
  );
}
