import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Suspense } from "react";
import { ReportBarChart, type BarDatum } from "@/components/reports/bar-chart";
import { DataTable } from "@/components/reports/data-table";
import { HabitStatsTable } from "@/components/reports/habit-stats-table";
import { StatTile } from "@/components/reports/stat-tile";
import { btnIcon } from "@/components/ui/styles";
import { isDateString, shiftDate } from "@/lib/dates";
import { formatDayLong, formatDayMonth, formatPercent, formatWeekdayShort } from "@/lib/format";
import { getEarliestStartDate, getWeeklyReport, type WeeklyMode } from "@/lib/services/report-service";
import { getToday } from "@/lib/services/settings-service";

export const metadata: Metadata = { title: "Laporan Mingguan" };

export default function WeeklyReportPage({ searchParams }: PageProps<"/reports/weekly">) {
  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">Laporan Mingguan</h1>
      <Suspense fallback={<p className="mt-2 text-muted">Memuat…</p>}>
        <WeeklyContent searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const weekHref = (anchor: string) => `/reports/weekly?mode=calendar&w=${anchor}`;

async function WeeklyContent({ searchParams }: { searchParams: PageProps<"/reports/weekly">["searchParams"] }) {
  const params = await searchParams;
  const today = await getToday();
  const mode: WeeklyMode = first(params.mode) === "calendar" ? "calendar" : "rolling";
  const wParam = first(params.w);
  const anchor = wParam && isDateString(wParam) && wParam <= today ? wParam : today;

  const [{ report }, earliest] = await Promise.all([getWeeklyReport(mode, anchor, today), getEarliestStartDate()]);
  const { summary, days, bestDay } = report;

  const hasPrev = mode === "calendar" && earliest !== null && shiftDate(report.from, -1) >= earliest;
  const hasNext = mode === "calendar" && shiftDate(report.from, 7) <= today;
  const against = mode === "rolling" ? "7 hari sebelumnya" : "minggu sebelumnya";

  const data: BarDatum[] = days.map((day) => ({
    label: `${formatWeekdayShort(day.date)} ${day.date.slice(8)}`,
    value: day.ratio === null ? null : day.ratio * 100,
    highlight: day.date === bestDay?.date,
    detail: day.future ? "Belum tiba" : day.eligible === 0 ? "Tidak ada habit aktif" : `${day.checked} dari ${day.eligible} selesai`,
  }));

  return (
    <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Periode" className="flex rounded-lg border border-border bg-surface p-0.5 text-sm">
          <Link href="/reports/weekly" aria-current={mode === "rolling" ? "page" : undefined} className={`rounded-md px-3 py-1 ${mode === "rolling" ? "bg-foreground text-background" : "text-muted"}`}>
            7 hari terakhir
          </Link>
          <Link href={weekHref(today)} aria-current={mode === "calendar" ? "page" : undefined} className={`rounded-md px-3 py-1 ${mode === "calendar" ? "bg-foreground text-background" : "text-muted"}`}>
            Minggu kalender
          </Link>
        </div>

        {mode === "calendar" && (
          <div className="flex items-center gap-2">
            {hasPrev ? (
              <Link href={weekHref(shiftDate(report.from, -7))} className={btnIcon} aria-label="Minggu sebelumnya">
                <ChevronLeft className="size-4" aria-hidden />
              </Link>
            ) : (
              <span className={`${btnIcon} opacity-50`} aria-hidden><ChevronLeft className="size-4" /></span>
            )}
            <p className="min-w-40 text-center font-medium" aria-live="polite">
              {formatDayMonth(report.from)} – {formatDayMonth(report.to)} {report.to.slice(0, 4)}
            </p>
            {hasNext ? (
              <Link href={weekHref(shiftDate(report.from, 7))} className={btnIcon} aria-label="Minggu berikutnya">
                <ChevronRight className="size-4" aria-hidden />
              </Link>
            ) : (
              <span className={`${btnIcon} opacity-50`} aria-hidden><ChevronRight className="size-4" /></span>
            )}
          </div>
        )}
        {mode === "rolling" && (
          <p className="text-muted">
            {formatDayMonth(report.from)} – {formatDayMonth(report.to)} {report.to.slice(0, 4)}
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Tingkat penyelesaian" value={formatPercent(summary.rate)} delta={{ points: report.change, against }} note={`${summary.checked} dari ${summary.eligible} habit-hari`} />
        <StatTile label="Hari sempurna" value={String(summary.perfectDays)} note="Seluruh habit tercentang" />
        <StatTile label="Hari aktif" value={String(summary.activeDays)} note="Minimal satu centang" />
        <StatTile
          label="Hari paling produktif"
          value={bestDay ? `${formatWeekdayShort(bestDay.date)} ${formatDayMonth(bestDay.date)}` : "–"}
          note={bestDay ? `${bestDay.checked} dari ${bestDay.eligible} · ${formatPercent(bestDay.ratio)}` : "Belum ada data"}
        />
      </div>

      <section aria-labelledby="daily-title" className="rounded-xl border border-border bg-surface p-4">
        <h2 id="daily-title" className="font-semibold">Progres harian</h2>
        <p className="mb-2 text-sm text-muted">Hari paling produktif disorot.</p>
        <ReportBarChart data={data} ariaLabel="Grafik batang progres harian dalam persen" />
        <DataTable
          caption="Progres harian"
          head={["Tanggal", "Selesai", "Progres"]}
          rows={days.map((d) => [formatDayLong(d.date), d.eligible === 0 ? "–" : `${d.checked}/${d.eligible}`, formatPercent(d.ratio)])}
        />
      </section>

      <section aria-labelledby="habit-title">
        <h2 id="habit-title" className="mb-3 font-semibold">Per habit</h2>
        <HabitStatsTable rows={report.habits} />
      </section>
    </div>
  );
}
