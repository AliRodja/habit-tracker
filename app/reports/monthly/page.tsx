import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ReportBarChart, type BarDatum } from "@/components/reports/bar-chart";
import { DataTable } from "@/components/reports/data-table";
import { HabitStatsTable } from "@/components/reports/habit-stats-table";
import { ReportGlossary } from "@/components/reports/report-glossary";
import { ReportHeader } from "@/components/reports/report-header";
import { StatTile } from "@/components/reports/stat-tile";
import { YearSelect } from "@/components/tracker/year-select";
import { Card } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import { formatYearMonth, parseYearMonth } from "@/lib/dates";
import { formatMonthName, formatMonthYear, formatPercent } from "@/lib/format";
import { firstParam, yearRange } from "@/lib/search-params";
import { getEarliestStartDate, getMonthlyReport } from "@/lib/services/report-service";
import { getToday } from "@/lib/services/settings-service";

export const metadata: Metadata = { title: "Laporan Bulanan" };

export default function MonthlyReportPage({ searchParams }: PageProps<"/reports/monthly">) {
  return (
    <>
      <ReportHeader active="monthly" title="Laporan Bulanan" description="Perkembangan dari bulan ke bulan, serta habit yang paling lancar dan yang perlu perhatian." />
      <Suspense fallback={<Loading />}>
        <MonthlyContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const href = (year: number, month: number) => `/reports/monthly?m=${formatYearMonth(year, month)}`;

async function MonthlyContent({ searchParams }: { searchParams: PageProps<"/reports/monthly">["searchParams"] }) {
  const params = await searchParams;
  const today = await getToday();
  const { years, current, clamp } = yearRange(await getEarliestStartDate(), today);

  const requested = parseYearMonth(firstParam(params.m)) ?? { year: current, month: Number(today.slice(5, 7)) };
  const year = clamp(requested.year);
  const month = year === requested.year ? requested.month : 1;

  const report = await getMonthlyReport(year, month, today);
  const { summary } = report;

  const monthData: BarDatum[] = report.months.map((m) => ({
    label: formatMonthName(m.month).slice(0, 3),
    value: m.rate === null ? null : m.rate * 100,
    highlight: m.month === month,
    detail: m.eligible === 0 ? "Belum ada habit aktif" : `${m.checked} dari ${m.eligible} centang`,
  }));
  const habitData: BarDatum[] = report.habits.map((h) => ({
    label: h.name,
    value: h.rate === null ? null : h.rate * 100,
    highlight: true,
    detail: `${h.checked} dari ${h.eligible} hari`,
  }));

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <YearSelect years={years} value={year} hrefs={Object.fromEntries(years.map((y) => [y, href(y, y === year ? month : 1)]))} />
        <nav aria-label="Pilih bulan" className="flex flex-wrap gap-1">
          {report.months.map((m) => (
            <Link
              key={m.month}
              href={href(year, m.month)}
              aria-current={m.month === month ? "page" : undefined}
              className={`rounded-lg border px-2.5 py-1 text-sm capitalize transition-colors ${
                m.month === month ? "border-accent bg-accent text-accent-foreground" : "border-border bg-surface text-muted hover:text-foreground"
              }`}
            >
              {formatMonthName(m.month).slice(0, 3)}
            </Link>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label={`Tingkat ${formatMonthYear(year, month)}`} value={formatPercent(summary.rate)} note={`${summary.checked} dari ${summary.eligible} centang yang mungkin`} />
        <StatTile label="Hari sempurna" value={String(summary.perfectDays)} note="Semua habit tercentang" />
        <StatTile label="Hari aktif" value={String(summary.activeDays)} note="Minimal satu centang" />
        <StatTile label="Paling lancar" value={report.best ? report.best.name : "–"} note={report.best ? `${formatPercent(report.best.rate)} · ${report.best.checked}/${report.best.eligible} hari` : "Belum ada data"} />
        <StatTile
          label="Perlu perhatian"
          value={report.needsAttention ? report.needsAttention.name : "–"}
          note={report.needsAttention ? `${formatPercent(report.needsAttention.rate)} · ${report.needsAttention.checked}/${report.needsAttention.eligible} hari` : "Semua habit sejalan"}
        />
      </div>

      <Card id="year-title" title={`Tingkat penyelesaian per bulan, ${year}`} description="Bulan yang dipilih diberi warna lebih tegas. Bulan tanpa habit aktif dibiarkan kosong, bukan 0%.">
        <ReportBarChart data={monthData} ariaLabel={`Grafik batang tingkat penyelesaian per bulan tahun ${year}`} />
        <DataTable
          caption={`Tingkat penyelesaian per bulan ${year}`}
          head={["Bulan", "Selesai", "Tingkat"]}
          rows={report.months.map((m) => [formatMonthName(m.month), m.eligible === 0 ? "–" : `${m.checked}/${m.eligible}`, formatPercent(m.rate)])}
        />
      </Card>

      <Card id="dist-title" title={`Per habit, ${formatMonthYear(year, month)}`} description="Persentase hari yang dicentang untuk setiap habit.">
        {habitData.length === 0 ? (
          <p className="text-sm text-muted">Belum ada habit pada bulan ini.</p>
        ) : (
          <>
            <ReportBarChart data={habitData} orientation="horizontal" height={Math.max(120, habitData.length * 44 + 40)} ariaLabel="Grafik batang tingkat penyelesaian per habit" />
            <DataTable caption="Tingkat penyelesaian per habit" head={["Habit", "Selesai", "Tingkat"]} rows={report.habits.map((h) => [h.name, `${h.checked}/${h.eligible}`, formatPercent(h.rate)])} />
          </>
        )}
      </Card>

      <section aria-labelledby="habit-title">
        <h2 id="habit-title" className="mb-3 font-semibold">
          Rincian per habit
        </h2>
        <HabitStatsTable rows={report.habits} />
      </section>

      <ReportGlossary />
    </div>
  );
}
