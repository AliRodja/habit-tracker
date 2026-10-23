import type { Metadata } from "next";
import { Suspense } from "react";
import { Heatmap } from "@/components/reports/heatmap";
import { ReportBarChart, type BarDatum } from "@/components/reports/bar-chart";
import { DataTable } from "@/components/reports/data-table";
import { HabitStatsTable } from "@/components/reports/habit-stats-table";
import { StatTile } from "@/components/reports/stat-tile";
import { YearSelect } from "@/components/tracker/year-select";
import { formatPercent, weekdayShortOf } from "@/lib/format";
import { getEarliestStartDate, getYearlyReport } from "@/lib/services/report-service";
import { getToday } from "@/lib/services/settings-service";

export const metadata: Metadata = { title: "Laporan Tahunan" };

export default function YearlyReportPage({ searchParams }: PageProps<"/reports/yearly">) {
  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">Laporan Tahunan</h1>
      <Suspense fallback={<p className="mt-2 text-muted">Memuat…</p>}>
        <YearlyContent searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

async function YearlyContent({ searchParams }: { searchParams: PageProps<"/reports/yearly">["searchParams"] }) {
  const params = await searchParams;
  const today = await getToday();
  const currentYear = Number(today.slice(0, 4));
  const earliest = await getEarliestStartDate();
  const minYear = Math.min(currentYear, earliest ? Number(earliest.slice(0, 4)) : currentYear);
  const years = Array.from({ length: currentYear - minYear + 1 }, (_, i) => minYear + i);

  const requested = Number(first(params.y));
  const year = Number.isInteger(requested) && requested >= minYear && requested <= currentYear ? requested : currentYear;

  const report = await getYearlyReport(year, today);
  const { summary } = report;

  const best = report.weekdays.reduce<number | null>((max, w) => (w.average !== null && (max === null || w.average > max) ? w.average : max), null);
  const weekdayData: BarDatum[] = report.weekdays.map((w) => ({
    label: weekdayShortOf(w.dayOfWeek),
    value: w.average === null ? null : w.average * 100,
    highlight: w.average !== null && w.average === best,
    detail: w.sampleDays === 0 ? "Belum ada data" : `Rata-rata dari ${w.sampleDays} hari`,
  }));

  return (
    <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <YearSelect years={years} value={year} hrefs={Object.fromEntries(years.map((y) => [y, `/reports/yearly?y=${y}`]))} />
        {year === currentYear && <p className="text-sm text-muted">Dihitung sampai hari ini.</p>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Tingkat penyelesaian" value={formatPercent(summary.rate)} note={`${summary.checked} dari ${summary.eligible} habit-hari`} />
        <StatTile label="Total centang" value={summary.checked.toLocaleString("id-ID")} />
        <StatTile label="Total hari aktif" value={String(summary.activeDays)} note={`dari ${summary.days.length} hari berlalu`} />
        <StatTile label="Total hari sempurna" value={String(summary.perfectDays)} note="Seluruh habit tercentang" />
      </div>

      <section aria-labelledby="heat-title" className="rounded-xl border border-border bg-surface p-4">
        <h2 id="heat-title" className="mb-3 font-semibold">Heatmap konsistensi</h2>
        <Heatmap days={report.heatmap} year={year} />
      </section>

      <section aria-labelledby="weekday-title" className="rounded-xl border border-border bg-surface p-4">
        <h2 id="weekday-title" className="font-semibold">Pola hari dalam seminggu</h2>
        <p className="mb-2 text-sm text-muted">Rata-rata progres harian. Hari paling konsisten disorot.</p>
        <ReportBarChart data={weekdayData} ariaLabel="Grafik batang rata-rata progres harian per hari dalam seminggu" />
        <DataTable
          caption="Rata-rata progres harian per hari dalam seminggu"
          head={["Hari", "Hari tercatat", "Rata-rata"]}
          rows={report.weekdays.map((w) => [weekdayShortOf(w.dayOfWeek), w.sampleDays, formatPercent(w.average)])}
        />
      </section>

      <section aria-labelledby="habit-title">
        <h2 id="habit-title" className="mb-3 font-semibold">Per habit</h2>
        <HabitStatsTable rows={report.habits} showStreak />
      </section>
    </div>
  );
}
