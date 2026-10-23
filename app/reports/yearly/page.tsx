import type { Metadata } from "next";
import { Suspense } from "react";
import { ReportBarChart, type BarDatum } from "@/components/reports/bar-chart";
import { DataTable } from "@/components/reports/data-table";
import { HabitStatsTable } from "@/components/reports/habit-stats-table";
import { Heatmap } from "@/components/reports/heatmap";
import { ReportGlossary } from "@/components/reports/report-glossary";
import { ReportHeader } from "@/components/reports/report-header";
import { StatTile } from "@/components/reports/stat-tile";
import { YearSelect } from "@/components/tracker/year-select";
import { Card } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import { formatPercent, weekdayShortOf } from "@/lib/format";
import { firstParam, yearRange } from "@/lib/search-params";
import { getEarliestStartDate, getYearlyReport } from "@/lib/services/report-service";
import { getToday } from "@/lib/services/settings-service";

export const metadata: Metadata = { title: "Laporan Tahunan" };

export default function YearlyReportPage({ searchParams }: PageProps<"/reports/yearly">) {
  return (
    <>
      <ReportHeader active="yearly" title="Laporan Tahunan" description="Gambaran satu tahun penuh: hari-hari konsisten, pola mingguan, dan streak terpanjang." />
      <Suspense fallback={<Loading />}>
        <YearlyContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function YearlyContent({ searchParams }: { searchParams: PageProps<"/reports/yearly">["searchParams"] }) {
  const params = await searchParams;
  const today = await getToday();
  const { years, current, clamp } = yearRange(await getEarliestStartDate(), today);
  const year = params.y === undefined ? current : clamp(Number(firstParam(params.y)));

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
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <YearSelect years={years} value={year} hrefs={Object.fromEntries(years.map((y) => [y, `/reports/yearly?y=${y}`]))} />
        {year === current && <p className="text-sm text-muted">Dihitung sampai hari ini.</p>}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Tingkat penyelesaian" value={formatPercent(summary.rate)} note={`${summary.checked} dari ${summary.eligible} centang yang mungkin`} />
        <StatTile label="Total centang" value={summary.checked.toLocaleString("id-ID")} />
        <StatTile label="Total hari aktif" value={String(summary.activeDays)} note={`dari ${summary.days.length} hari yang sudah lewat`} />
        <StatTile label="Total hari sempurna" value={String(summary.perfectDays)} note="Semua habit tercentang" />
      </div>

      <Card id="heat-title" title="Heatmap konsistensi" description="Setiap kotak adalah satu hari. Makin gelap warnanya, makin banyak habit yang selesai. Arahkan kursor ke kotak untuk melihat detail.">
        <Heatmap days={report.heatmap} year={year} />
      </Card>

      <Card id="weekday-title" title="Pola hari dalam seminggu" description="Rata-rata progres harian untuk setiap hari. Hari paling konsisten diberi warna lebih tegas.">
        <ReportBarChart data={weekdayData} ariaLabel="Grafik batang rata-rata progres harian per hari dalam seminggu" />
        <DataTable
          caption="Rata-rata progres harian per hari dalam seminggu"
          head={["Hari", "Hari tercatat", "Rata-rata"]}
          rows={report.weekdays.map((w) => [weekdayShortOf(w.dayOfWeek), w.sampleDays, formatPercent(w.average)])}
        />
      </Card>

      <section aria-labelledby="habit-title">
        <h2 id="habit-title" className="mb-3 font-semibold">
          Per habit
        </h2>
        <HabitStatsTable rows={report.habits} showStreak />
      </section>

      <ReportGlossary />
    </div>
  );
}
