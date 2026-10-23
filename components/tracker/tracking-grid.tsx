"use client";

import { Check } from "lucide-react";
import { useId, useOptimistic, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { setRecord, setRecordNote } from "@/lib/actions/record-actions";
import { formatDayLong, formatPercent, formatWeekdayShort } from "@/lib/format";
import { rowProgress, type GridRow } from "@/lib/grid";
import { colorDot } from "@/lib/habit-colors";
import { btnPrimary, btnSecondary, inputClass } from "@/components/ui/styles";

export interface GridHabit {
  id: string;
  name: string;
  color: string;
}

interface Props {
  title: string;
  habits: GridHabit[];
  rows: GridRow[];
  /** Tampilan rapat untuk 12 bulan dalam satu halaman. */
  compact?: boolean;
}

type Toggle = { rowIndex: number; colIndex: number; completed: boolean };

const NOTE_MAX = 200;
const SAVE_FAILED = "Gagal menyimpan. Periksa koneksi lalu coba lagi.";

export function TrackingGrid({ title, habits, rows, compact = false }: Props) {
  const [optimisticRows, applyToggle] = useOptimistic<GridRow[], Toggle>(rows, (state, { rowIndex, colIndex, completed }) =>
    state.map((row, r) =>
      r !== rowIndex ? row : { ...row, cells: row.cells.map((cell, c) => (c === colIndex ? { ...cell, completed } : cell)) },
    ),
  );
  const [, startTransition] = useTransition();
  const [pendingNote, startNoteTransition] = useTransition();
  const uid = useId();
  const [error, setError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);

  const todayRow = rows.findIndex((row) => row.isToday);
  const [active, setActive] = useState({ r: Math.max(todayRow, 0), c: 0 });
  const tableRef = useRef<HTMLTableElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [noteTarget, setNoteTarget] = useState<{ r: number; c: number } | null>(null);

  const lastRow = optimisticRows.length - 1;
  const lastCol = habits.length - 1;

  function toggle(r: number, c: number) {
    const cell = optimisticRows[r].cells[c];
    if (!cell.eligible) return;
    const completed = !cell.completed;
    startTransition(async () => {
      applyToggle({ rowIndex: r, colIndex: c, completed });
      try {
        const result = await setRecord(habits[c].id, optimisticRows[r].date, completed);
        setError(result.ok ? null : result.message);
      } catch {
        setError(SAVE_FAILED);
      }
      // Bila gagal, nilai optimistik kembali sendiri ke data server saat transition selesai (FR-11).
    });
  }

  function openNote(r: number, c: number) {
    if (!optimisticRows[r].cells[c].eligible) return;
    setNoteTarget({ r, c });
    setNoteError(null);
    dialogRef.current?.showModal();
  }

  function saveNote(formData: FormData) {
    if (!noteTarget) return;
    const note = String(formData.get("note") ?? "");
    startNoteTransition(async () => {
      try {
        const result = await setRecordNote(habits[noteTarget.c].id, optimisticRows[noteTarget.r].date, note);
        if (result.ok) dialogRef.current?.close();
        else setNoteError(result.message);
      } catch {
        setNoteError(SAVE_FAILED);
      }
    });
  }

  function onKeyDown(event: KeyboardEvent<HTMLTableElement>) {
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-cell]");
    if (!target || event.altKey || event.ctrlKey || event.metaKey) return;
    const r = Number(target.dataset.r);
    const c = Number(target.dataset.c);

    if (event.key === "n" || event.key === "N" || event.key === "ContextMenu") {
      event.preventDefault();
      openNote(r, c);
      return;
    }

    let next: { r: number; c: number };
    switch (event.key) {
      case "ArrowUp": next = { r: Math.max(0, r - 1), c }; break;
      case "ArrowDown": next = { r: Math.min(lastRow, r + 1), c }; break;
      case "ArrowLeft": next = { r, c: Math.max(0, c - 1) }; break;
      case "ArrowRight": next = { r, c: Math.min(lastCol, c + 1) }; break;
      case "Home": next = { r, c: 0 }; break;
      case "End": next = { r, c: lastCol }; break;
      default: return; // Spasi/Enter ditangani tombol secara native.
    }
    event.preventDefault();
    setActive(next);
    tableRef.current?.querySelector<HTMLElement>(`[data-r="${next.r}"][data-c="${next.c}"]`)?.focus();
  }

  const noteCell = noteTarget ? optimisticRows[noteTarget.r].cells[noteTarget.c] : null;
  const noteDate = noteTarget ? optimisticRows[noteTarget.r].date : "";
  const noteHabit = noteTarget ? habits[noteTarget.c] : null;

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table ref={tableRef} onKeyDown={onKeyDown} className="w-full border-collapse text-sm">
          <caption className="sr-only">
            {title}. Gunakan tombol panah untuk berpindah sel, Spasi atau Enter untuk mencentang, dan N untuk catatan.
          </caption>
          <thead>
            <tr className="border-b border-border text-left">
              <th scope="col" className="sticky left-0 bg-surface px-3 py-2 font-medium">
                Tanggal
              </th>
              {habits.map((habit) => (
                <th key={habit.id} scope="col" className="px-1 py-2 text-center font-medium">
                  <span className="flex flex-col items-center gap-1">
                    <span className={`size-2.5 rounded-full ${colorDot(habit.color)}`} aria-hidden />
                    <span className={compact ? "max-w-14 truncate text-xs" : "max-w-24 truncate"} title={habit.name}>
                      {habit.name}
                    </span>
                  </span>
                </th>
              ))}
              <th scope="col" className="px-3 py-2 text-right font-medium">
                Progres
              </th>
            </tr>
          </thead>
          <tbody>
            {optimisticRows.map((row, r) => {
              const progress = rowProgress(row);
              return (
                <tr key={row.date} className={`border-b border-border last:border-b-0 ${row.isToday ? "bg-amber-100/60 dark:bg-amber-400/10" : ""}`}>
                  <th
                    scope="row"
                    className={`sticky left-0 whitespace-nowrap px-3 py-1 text-left font-normal ${row.isToday ? "bg-amber-100 dark:bg-stone-800" : "bg-surface"}`}
                  >
                    <span className="tabular-nums">{row.date.slice(8)}</span>{" "}
                    <span className="text-muted">{formatWeekdayShort(row.date)}</span>
                    {row.isToday && <span className="ml-1.5 rounded bg-foreground px-1 py-0.5 text-[10px] font-semibold text-background">Hari ini</span>}
                  </th>
                  {row.cells.map((cell, c) => {
                    const habit = habits[c];
                    const label = `${habit.name}, ${formatDayLong(row.date)}: ${
                      !cell.eligible ? "tidak tersedia" : cell.completed ? "selesai" : "belum"
                    }${cell.note ? ", ada catatan" : ""}`;
                    return (
                      <td key={habit.id} className="p-0.5 text-center">
                        <button
                          type="button"
                          data-cell
                          data-r={r}
                          data-c={c}
                          tabIndex={active.r === r && active.c === c ? 0 : -1}
                          aria-label={label}
                          aria-pressed={cell.eligible ? cell.completed : undefined}
                          aria-disabled={!cell.eligible}
                          title={cell.note ?? undefined}
                          onFocus={() => setActive({ r, c })}
                          onClick={() => toggle(r, c)}
                          onContextMenu={(event) => {
                            if (!cell.eligible) return;
                            event.preventDefault();
                            openNote(r, c);
                          }}
                          className={`relative mx-auto flex items-center justify-center rounded-md border transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-foreground ${
                            compact ? "size-6" : "size-8"
                          } ${
                            !cell.eligible
                              ? "cursor-not-allowed border-transparent bg-border/50"
                              : cell.completed
                                ? `${colorDot(habit.color)} border-transparent text-white`
                                : "border-border bg-background hover:border-muted"
                          }`}
                        >
                          {cell.eligible && cell.completed && <Check className={compact ? "size-3.5" : "size-4"} aria-hidden strokeWidth={3} />}
                          {cell.note && <span aria-hidden className="absolute -top-0.5 -right-0.5 size-2 rounded-full border border-surface bg-foreground" />}
                        </button>
                      </td>
                    );
                  })}
                  <td className="whitespace-nowrap px-3 py-1 text-right tabular-nums" title={progress.eligible ? `${progress.checked} dari ${progress.eligible}` : undefined}>
                    {formatPercent(progress.ratio)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
        {error}
      </p>

      <dialog
        ref={dialogRef}
        onClose={() => setNoteTarget(null)}
        aria-labelledby={`${uid}-note-title`}
        className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-border bg-surface p-5 text-foreground backdrop:bg-black/50"
      >
        {noteTarget && noteCell && noteHabit && (
          <form action={saveNote} className="grid gap-3" key={`${noteDate}-${noteHabit.id}`}>
            <h2 id={`${uid}-note-title`} className="text-lg font-semibold">
              Catatan: {noteHabit.name}
            </h2>
            <p className="text-sm text-muted">{formatDayLong(noteDate)}</p>
            <label htmlFor={`${uid}-note-text`} className="sr-only">
              Catatan
            </label>
            <textarea id={`${uid}-note-text`} name="note" rows={3} maxLength={NOTE_MAX} defaultValue={noteCell.note ?? ""} className={inputClass} placeholder="Tulis catatan singkat (maks. 200 karakter)" />
            {noteError && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {noteError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" className={btnSecondary} onClick={() => dialogRef.current?.close()}>
                Batal
              </button>
              <button type="submit" className={btnPrimary} disabled={pendingNote}>
                {pendingNote ? "Menyimpan…" : "Simpan"}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </div>
  );
}
