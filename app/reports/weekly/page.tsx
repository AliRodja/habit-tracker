import type { Metadata } from "next";
import { Suspense } from "react";
import { ReportBarChart, type BarDatum } from "@/components/reports/bar-chart";
import { DataTable } from "@/components/reports/data-table";
import { HabitStatsTable } from "@/components/reports/habit-stats-table";
import { ReportGlossary } from "@/components/reports/report-glossary";
import { ReportHeader } from "@/components/reports/report-header";
import { StatTile } from "@/components/reports/stat-tile";
import { Card } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import { PeriodNav } from "@/components/ui/period-nav";
import { SegmentedNav } from "@/components/ui/segmented-nav";
import { isDateString, shiftDate } from "@/lib/dates";
import { formatDayLong, formatDayMonth, formatPercent, formatWeekdayShort } from "@/lib/format";
import { firstParam } from "@/lib/search-params";
import { getEarliestStartDate, getWeeklyReport, type WeeklyMode } from "@/lib/services/report-service";
import { getToday } from "@/lib/services/settings-service";

export const metadata: Metadata = { title: "Laporan Mingguan" };

export default function WeeklyReportPage({ searchParams }: PageProps<"/reports/weekly">) {
  return (
    <>
      <ReportHeader active="weekly" title="Laporan Mingguan" description="Seberapa konsisten Anda dalam tujuh hari, dibandingkan dengan minggu sebelumnya." />
      <Suspense fallback={<Loading />}>
        <WeeklyContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const weekHref = (anchor: string) => `/reports/weekly?mode=calendar&w=${anchor}`;

async function WeeklyContent({ searchParams }: { searchParams: PageProps<"/reports/weekly">["searchParams"] }) {
  const params = await searchParams;
  const today = await getToday();
  const mode: WeeklyMode = firstParam(params.mode) === "calendar" ? "calendar" : "rolling";
  const wParam = firstParam(params.w);
  const anchor = wParam && isDateString(wParam) && wParam <= today ? wParam : today;

  const [{ report }, earliest] = await Promise.all([getWeeklyReport(mode, anchor, today), getEarliestStartDate()]);
  const { summary, days, bestDay } = report;
  const rangeLabel = `${formatDayMonth(report.from)} – ${formatDayMonth(report.to)} ${report.to.slice(0, 4)}`;
  const against = mode === "rolling" ? "7 hari sebelumnya" : "minggu sebelumnya";

  const data: BarDatum[] = days.map((day) => ({
    label: `${formatWeekdayShort(day.date)} ${day.date.slice(8)}`,
    value: day.ratio === null ? null : day.ratio * 100,
    highlight: day.date === bestDay?.date,
    detail: day.future ? "Belum tiba" : day.eligible === 0 ? "Belum ada habit aktif" : `${day.checked} dari ${day.eligible} selesai`,
  }));

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedNav
          label="Periode"
          items={[
            { href: "/reports/weekly", label: "7 hari terakhir", active: mode === "rolling" },
            { href: weekHref(today), label: "Minggu kalender", active: mode === "calendar" },
          ]}
        />
        {mode === "calendar" ? (
          <PeriodNav
            label={rangeLabel}
            previous={earliest !== null && shiftDate(report.from, -1) >= earliest ? { href: weekHref(shiftDate(report.from, -7)), label: "Minggu sebelumnya" } : null}
            next={shiftDate(report.from, 7) <= today ? { href: weekHref(shiftDate(report.from, 7)), label: "Minggu berikutnya" } : null}
          />
        ) : (
          <p className="font-semibold">{rangeLabel}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Tingkat penyelesaian" value={formatPercent(summary.rate)} delta={{ points: report.change, against }} note={`${summary.checked} dari ${summary.eligible} centang yang mungkin`} />
        <StatTile label="Hari sempurna" value={String(summary.perfectDays)} note="Semua habit tercentang" />
        <StatTile label="Hari aktif" value={String(summary.activeDays)} note="Minimal satu centang" />
        <StatTile
          label="Hari paling produktif"
          value={bestDay ? `${formatWeekdayShort(bestDay.date)} ${formatDayMonth(bestDay.date)}` : "–"}
          note={bestDay ? `${bestDay.checked} dari ${bestDay.eligible} · ${formatPercent(bestDay.ratio)}` : "Belum ada data"}
        />
      </div>

      <Card id="daily-title" title="Progres harian" description="Persentase habit yang selesai setiap hari. Hari paling produktif diberi warna lebih tegas.">
        <ReportBarChart data={data} ariaLabel="Grafik batang progres harian dalam persen" />
        <DataTable
          caption="Progres harian"
          head={["Tanggal", "Selesai", "Progres"]}
          rows={days.map((d) => [formatDayLong(d.date), d.eligible === 0 ? "–" : `${d.checked}/${d.eligible}`, formatPercent(d.ratio)])}
        />
      </Card>

      <section aria-labelledby="habit-title">
        <h2 id="habit-title" className="mb-3 font-semibold">
          Per habit
        </h2>
        <HabitStatsTable rows={report.habits} />
      </section>

      <ReportGlossary />
    </div>
  );
}
