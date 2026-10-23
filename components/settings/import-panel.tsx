"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Notice } from "@/components/ui/notice";
import { btnDanger, btnPrimary, btnSecondary } from "@/components/ui/styles";

type Mode = "merge" | "replace";

interface Issue {
  scope: string;
  row: number | null;
  message: string;
}

interface ImportResponse {
  dryRun: boolean;
  applied: boolean;
  backupPath: string | null;
  format: "json" | "csv";
  mode: Mode;
  counts: {
    habits: { total: number; created: number; updated: number };
    records: { total: number; created: number; updated: number };
    activeAfter: number;
  };
  canApply: boolean;
  issueCount: number;
  issues: Issue[];
}

const SCOPE_LABEL: Record<string, string> = { habit: "Habit", record: "Catatan", csv: "CSV", file: "Berkas" };

/** FR-19.2: unggah → validasi → pratinjau → pilih mode → konfirmasi. */
export function ImportPanel() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<Mode>("merge");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<ImportResponse | null>(null);
  const [applied, setApplied] = useState<ImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [understood, setUnderstood] = useState(false);

  const isCsv = file?.name.toLowerCase().endsWith(".csv") ?? false;
  const effectiveMode: Mode = isCsv ? "merge" : mode;

  async function send(dryRun: boolean) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch(`/api/import?mode=${effectiveMode}&dryRun=${dryRun}`, { method: "POST", body });
      const data = await response.json();
      if (!response.ok && !data.issues) throw new Error(data.message ?? "Impor gagal.");
      if (dryRun) {
        setPreview(data);
        setApplied(null);
        setUnderstood(false);
      } else {
        setApplied(data);
        setPreview(data.applied ? null : data);
        if (data.applied) {
          router.refresh();
          setFile(null);
          if (inputRef.current) inputRef.current.value = "";
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impor gagal.");
    } finally {
      setBusy(false);
    }
  }

  const reset = () => {
    setPreview(null);
    setApplied(null);
    setError(null);
  };

  const step = (n: number, title: string) => (
    <p className="mb-2 flex items-center gap-2 text-sm font-medium">
      <span className="flex size-5 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent-text" aria-hidden>
        {n}
      </span>
      {title}
    </p>
  );

  return (
    <div className="grid gap-5">
      <div>
        {step(1, "Pilih berkas")}
        <label htmlFor="import-file" className="sr-only">
          Berkas impor (JSON hasil ekspor atau CSV format panjang)
        </label>
        <input
          ref={inputRef}
          id="import-file"
          type="file"
          accept=".json,.csv,application/json,text/csv"
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            reset();
          }}
          className="block w-full rounded-xl border border-dashed border-border bg-surface-2 p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-surface file:px-3 file:py-1.5 file:text-sm file:font-medium file:shadow-sm"
        />
        <p className="mt-1.5 text-xs text-muted">JSON hasil Ekspor (cadangan lengkap) atau CSV format panjang.</p>
      </div>

      <fieldset>
        <legend className="contents">{step(2, "Pilih cara mengimpor")}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ["merge", "Gabung", "Tambahkan isi berkas ke data yang ada. Data yang sama akan diperbarui; data lain tidak disentuh."],
              ["replace", "Ganti", "Hapus seluruh data lalu ganti dengan isi berkas. Cadangan dibuat otomatis lebih dulu."],
            ] as const
          ).map(([value, label, hint]) => {
            const disabled = value === "replace" && isCsv;
            const selected = effectiveMode === value;
            return (
              <label
                key={value}
                className={`flex gap-3 rounded-xl border p-3 text-sm transition-colors ${selected ? "border-accent bg-accent-soft" : "border-border"} ${disabled ? "opacity-50" : "cursor-pointer hover:bg-surface-2"}`}
              >
                <input
                  type="radio"
                  name="import-mode"
                  value={value}
                  checked={selected}
                  disabled={disabled}
                  onChange={() => {
                    setMode(value);
                    reset();
                  }}
                  className="mt-0.5 accent-[var(--accent)]"
                />
                <span>
                  <span className="font-medium">{label}</span>
                  <span className="mt-0.5 block text-xs text-muted">{disabled ? "Tidak tersedia untuk CSV, karena CSV tidak memuat detail habit." : hint}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div>
        {step(3, "Periksa sebelum menerapkan")}
        <button type="button" className={btnSecondary} disabled={!file || busy} onClick={() => send(true)}>
          {busy && !preview ? "Memeriksa…" : "Periksa berkas"}
        </button>
        <p className="mt-1.5 text-xs text-muted">Pemeriksaan tidak mengubah data apa pun.</p>
      </div>

      <div role="status" aria-live="polite" className="grid gap-3">
        {error && <Notice tone="danger">{error}</Notice>}

        {applied?.applied && (
          <Notice tone="success">
            Impor berhasil: {applied.counts.habits.total} habit dan {applied.counts.records.total} catatan diproses.
            {applied.backupPath && (
              <>
                {" "}
                Cadangan data sebelumnya disimpan di <span className="break-all font-mono text-xs">{applied.backupPath}</span>
              </>
            )}
          </Notice>
        )}

        {preview && (
          <div className="rounded-xl border border-border bg-surface-2/60 p-4 text-sm">
            <p className="font-medium">
              Pratinjau · {preview.format.toUpperCase()} · mode {preview.mode === "merge" ? "Gabung" : "Ganti"}
            </p>
            <table className="mt-2 w-full max-w-md text-left">
              <thead>
                <tr className="text-muted">
                  <th scope="col" className="py-1 font-medium"></th>
                  <th scope="col" className="py-1 text-right font-medium">Total</th>
                  <th scope="col" className="py-1 text-right font-medium">Baru</th>
                  <th scope="col" className="py-1 text-right font-medium">Diperbarui</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {(["habits", "records"] as const).map((key) => (
                  <tr key={key} className="border-t border-border">
                    <th scope="row" className="py-1 font-normal">{key === "habits" ? "Habit" : "Catatan"}</th>
                    <td className="py-1 text-right">{preview.counts[key].total}</td>
                    <td className="py-1 text-right">{preview.counts[key].created}</td>
                    <td className="py-1 text-right">{preview.counts[key].updated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-muted">Habit aktif setelah impor: {preview.counts.activeAfter}</p>

            {preview.issueCount > 0 && (
              <div className="mt-3">
                <Notice tone="danger">
                  {preview.issueCount} galat ditemukan. Perbaiki berkas lalu periksa lagi; tidak ada data yang diubah.
                </Notice>
                <ul className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-border bg-surface p-2 text-xs">
                  {preview.issues.map((issue, i) => (
                    <li key={i} className="py-0.5">
                      <span className="font-medium">
                        {SCOPE_LABEL[issue.scope] ?? issue.scope}
                        {issue.row !== null && ` baris ${issue.row}`}:
                      </span>{" "}
                      {issue.message}
                    </li>
                  ))}
                  {preview.issueCount > preview.issues.length && (
                    <li className="py-0.5 text-muted">…dan {preview.issueCount - preview.issues.length} galat lainnya</li>
                  )}
                </ul>
              </div>
            )}

            {preview.canApply && (
              <div className="mt-4 grid gap-3 border-t border-border pt-4">
                {preview.mode === "replace" && (
                  <label className="flex items-start gap-2 text-sm">
                    <input type="checkbox" checked={understood} onChange={(event) => setUnderstood(event.target.checked)} className="mt-0.5 accent-[var(--accent)]" />
                    <span>Saya mengerti seluruh data saat ini akan diganti. Cadangan otomatis dibuat sebelum penggantian.</span>
                  </label>
                )}
                <div>
                  <button
                    type="button"
                    className={preview.mode === "replace" ? btnDanger : btnPrimary}
                    disabled={busy || (preview.mode === "replace" && !understood)}
                    onClick={() => send(false)}
                  >
                    {busy ? "Menerapkan…" : preview.mode === "replace" ? "Ganti seluruh data" : "Terapkan impor"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
