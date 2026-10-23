import type { Metadata } from "next";
import { Download } from "lucide-react";
import { Suspense } from "react";
import { DangerZone } from "@/components/settings/danger-zone";
import { ImportPanel } from "@/components/settings/import-panel";
import { SettingsForm } from "@/components/settings/settings-form";
import { btnSecondary, inputClass } from "@/components/ui/styles";
import { todayIn } from "@/lib/dates";
import { resolveDatabasePath } from "@/lib/db-path";
import { getBackupDir } from "@/lib/services/backup-service";
import { getSettings } from "@/lib/services/settings-store";
import { connection } from "next/server";

export const metadata: Metadata = { title: "Pengaturan" };

export default function SettingsPage() {
  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">Pengaturan</h1>
      <Suspense fallback={<p className="mt-2 text-muted">Memuat…</p>}>
        <SettingsContent />
      </Suspense>
    </section>
  );
}

function Card({ id, title, children, danger = false }: { id: string; title: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <section aria-labelledby={id} className={`rounded-xl border bg-surface p-5 ${danger ? "border-red-500/50" : "border-border"}`}>
      <h2 id={id} className={`mb-4 text-lg font-semibold ${danger ? "text-red-600 dark:text-red-400" : ""}`}>
        {title}
      </h2>
      {children}
    </section>
  );
}

async function SettingsContent() {
  await connection();
  const settings = await getSettings();
  const timeZones = Intl.supportedValuesOf("timeZone");
  if (!timeZones.includes(settings.timezone)) timeZones.unshift(settings.timezone);
  const year = Number(todayIn(settings.timezone).slice(0, 4));

  return (
    <div className="mt-6 grid gap-6">
      <Card id="general-title" title="Umum">
        <SettingsForm timeZones={timeZones} defaults={settings} />
      </Card>

      <Card id="storage-title" title="Penyimpanan lokal">
        <p className="text-sm text-muted">Seluruh data tersimpan di satu file SQLite di komputer ini. Salin file ini untuk mencadangkan secara manual.</p>
        <dl className="mt-3 grid gap-2 text-sm">
          <div>
            <dt className="text-muted">File database</dt>
            <dd className="break-all font-mono text-xs">{resolveDatabasePath()}</dd>
          </div>
          <div>
            <dt className="text-muted">Folder cadangan otomatis</dt>
            <dd className="break-all font-mono text-xs">{getBackupDir()}</dd>
          </div>
        </dl>
      </Card>

      <Card id="export-title" title="Ekspor data">
        <div className="flex flex-wrap gap-2">
          <a href="/api/export?format=json" download className={btnSecondary}>
            <Download className="size-4" aria-hidden /> Cadangan lengkap (JSON)
          </a>
          <a href="/api/export?format=csv-long" download className={btnSecondary}>
            <Download className="size-4" aria-hidden /> CSV format panjang
          </a>
        </div>
        <form action="/api/export" method="get" className="mt-4 flex flex-wrap items-end gap-2">
          <input type="hidden" name="format" value="csv-wide" />
          <div>
            <label htmlFor="export-year" className="mb-1 block text-sm font-medium">
              CSV format lebar (gaya spreadsheet) untuk tahun
            </label>
            <input id="export-year" name="year" type="number" min={1970} max={2100} defaultValue={year} className={`${inputClass} max-w-28`} />
          </div>
          <button type="submit" className={btnSecondary}>
            <Download className="size-4" aria-hidden /> Unduh
          </button>
        </form>
      </Card>

      <Card id="import-title" title="Impor data">
        <ImportPanel />
      </Card>

      <Card id="danger-title" title="Zona bahaya" danger>
        <DangerZone />
      </Card>
    </div>
  );
}
