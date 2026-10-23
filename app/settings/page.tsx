import { Download, FileJson, FileSpreadsheet, Table2 } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { DangerZone } from "@/components/settings/danger-zone";
import { ImportPanel } from "@/components/settings/import-panel";
import { SettingsForm } from "@/components/settings/settings-form";
import { Card } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import { PageHeader } from "@/components/ui/page-header";
import { btnSecondary, inputClass } from "@/components/ui/styles";
import { todayIn } from "@/lib/dates";
import { resolveDatabasePath } from "@/lib/db-path";
import { getBackupDir } from "@/lib/services/backup-service";
import { getSettings } from "@/lib/services/settings-store";

export const metadata: Metadata = { title: "Pengaturan" };

const SECTIONS = [
  ["#umum", "Umum"],
  ["#data", "Data & cadangan"],
  ["#zona-bahaya", "Zona bahaya"],
] as const;

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Pengaturan" description="Sesuaikan aplikasi, lalu cadangkan atau pindahkan data Anda.">
        <nav aria-label="Bagian pengaturan" className="flex flex-wrap gap-2 text-sm">
          {SECTIONS.map(([href, label]) => (
            <a key={href} href={href} className="rounded-lg border border-border bg-surface px-3 py-1.5 text-muted hover:text-foreground">
              {label}
            </a>
          ))}
        </nav>
      </PageHeader>
      <Suspense fallback={<Loading />}>
        <SettingsContent />
      </Suspense>
    </>
  );
}

function ExportRow({ icon: Icon, title, description, children }: { icon: typeof FileJson; title: string; description: string; children: React.ReactNode }) {
  return (
    <li className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Icon className="mt-0.5 size-5 shrink-0 text-accent-text" aria-hidden />
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted">{description}</p>
        </div>
      </div>
      {children}
    </li>
  );
}

async function SettingsContent() {
  await connection();
  const settings = await getSettings();
  const timeZones = Intl.supportedValuesOf("timeZone");
  if (!timeZones.includes(settings.timezone)) timeZones.unshift(settings.timezone);
  const year = Number(todayIn(settings.timezone).slice(0, 4));

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div id="umum" className="scroll-mt-6">
        <Card id="general-title" title="Umum" description="Zona waktu, batas habit, awal minggu, gamifikasi, dan tampilan.">
          <SettingsForm timeZones={timeZones} defaults={settings} />
        </Card>
      </div>

      <div id="data" className="grid scroll-mt-6 gap-6">
        <Card id="storage-title" title="Penyimpanan" description="Semua data tersimpan di satu file di komputer ini. Menyalin file ini sudah cukup sebagai cadangan manual.">
          <dl className="grid gap-3 text-sm">
            <div>
              <dt className="text-muted">File database</dt>
              <dd className="mt-0.5 break-all rounded-lg bg-surface-2 px-2.5 py-1.5 font-mono text-xs">{resolveDatabasePath()}</dd>
            </div>
            <div>
              <dt className="text-muted">Folder cadangan otomatis</dt>
              <dd className="mt-0.5 break-all rounded-lg bg-surface-2 px-2.5 py-1.5 font-mono text-xs">{getBackupDir()}</dd>
            </div>
          </dl>
        </Card>

        <Card id="export-title" title="Ekspor" description="Unduh salinan data untuk cadangan atau dibuka di spreadsheet.">
          <ul className="divide-y divide-border">
            <ExportRow icon={FileJson} title="Cadangan lengkap (JSON)" description="Semua habit, catatan, dan pengaturan. Bisa diimpor kembali kapan saja.">
              <a href="/api/export?format=json" download className={btnSecondary}>
                <Download className="size-4" aria-hidden /> Unduh JSON
              </a>
            </ExportRow>
            <ExportRow icon={FileSpreadsheet} title="CSV format panjang" description="Satu baris per catatan. Cocok untuk analisis lanjutan atau diimpor kembali.">
              <a href="/api/export?format=csv-long" download className={btnSecondary}>
                <Download className="size-4" aria-hidden /> Unduh CSV
              </a>
            </ExportRow>
            <ExportRow icon={Table2} title="CSV format lebar (gaya spreadsheet)" description="Satu baris per tanggal dan satu kolom per habit, seperti tabel di Tracker.">
              <form action="/api/export" method="get" className="flex items-center gap-2">
                <input type="hidden" name="format" value="csv-wide" />
                <label htmlFor="export-year" className="sr-only">
                  Tahun untuk CSV format lebar
                </label>
                <input id="export-year" name="year" type="number" min={1970} max={2100} defaultValue={year} className={`${inputClass} max-w-24`} />
                <button type="submit" className={btnSecondary}>
                  <Download className="size-4" aria-hidden /> Unduh
                </button>
              </form>
            </ExportRow>
          </ul>
        </Card>

        <Card id="import-title" title="Impor" description="Pulihkan cadangan atau pindahkan data dari komputer lain.">
          <ImportPanel />
        </Card>
      </div>

      <div id="zona-bahaya" className="scroll-mt-6">
        <Card id="danger-title" title="Zona bahaya" tone="danger">
          <DangerZone />
        </Card>
      </div>
    </div>
  );
}
