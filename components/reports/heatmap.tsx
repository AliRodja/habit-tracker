"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { formatDayLong, formatMonthName } from "@/lib/format";
import { mondayFirstRow, type HeatmapDay } from "@/lib/reports";

const CELL = 14;
const GAP = 2;
const ROW_LABELS = ["Sen", "", "Rab", "", "Jum", "", ""];
const LEVEL_NAMES = ["tidak ada centang", "rendah", "sedang", "tinggi", "sempurna"];

function describe(day: HeatmapDay): { title: string; detail: string } {
  const title = formatDayLong(day.date);
  if (day.future) return { title, detail: "Belum tiba" };
  if (day.eligible === 0) return { title, detail: "Tidak ada habit aktif" };
  const percent = Math.round((day.checked / day.eligible) * 100);
  return { title, detail: `${day.checked} dari ${day.eligible} selesai · ${percent}%` };
}

interface Tip {
  x: number;
  y: number;
  title: string;
  detail: string;
}

/** FR-16.3: heatmap gaya kalender kontribusi (kolom = minggu, baris = Senin–Minggu). */
export function Heatmap({ days, year }: { days: HeatmapDay[]; year: number }) {
  const offset = mondayFirstRow(days[0].date);
  const weeks = Math.ceil((days.length + offset) / 7);

  // Fokus awal pada hari terakhir yang sudah berlalu, bukan 366 titik tab (roving tabindex).
  const lastPast = days.reduce((last, d, i) => (!d.future ? i : last), 0);
  const [active, setActive] = useState(lastPast);
  const [tip, setTip] = useState<Tip | null>(null);
  const cells = useRef<(HTMLDivElement | null)[]>([]);

  function show(index: number) {
    const el = cells.current[index];
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.min(Math.max(rect.left + rect.width / 2, 110), window.innerWidth - 110);
    setTip({ x, y: rect.top, ...describe(days[index]) });
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>, index: number) {
    const step = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7 }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const next = Math.min(days.length - 1, Math.max(0, index + step));
    setActive(next);
    cells.current[next]?.focus();
  }

  const monthLabels = days
    .map((day, i) => ({ day, col: Math.floor((i + offset) / 7) }))
    .filter(({ day }) => day.date.endsWith("-01"));

  return (
    <div>
      <div className="overflow-x-auto pb-2">
        <div className="inline-grid" style={{ gridTemplateColumns: `28px auto`, columnGap: 6 }}>
          <div />
          <div className="relative h-4 text-xs text-muted" aria-hidden>
            {monthLabels.map(({ day, col }) => (
              <span key={day.date} className="absolute capitalize" style={{ left: col * (CELL + GAP) }}>
                {formatMonthName(Number(day.date.slice(5, 7))).slice(0, 3)}
              </span>
            ))}
          </div>

          <div className="grid text-xs text-muted" style={{ gridTemplateRows: `repeat(7, ${CELL}px)`, rowGap: GAP }} aria-hidden>
            {ROW_LABELS.map((label, i) => (
              <span key={i} className="leading-3">
                {label}
              </span>
            ))}
          </div>
          <div
            role="group"
            aria-label={`Heatmap konsistensi ${year}. Gunakan tombol panah untuk berpindah hari.`}
            className="grid"
            style={{
              gridTemplateRows: `repeat(7, ${CELL}px)`,
              gridTemplateColumns: `repeat(${weeks}, ${CELL}px)`,
              gridAutoFlow: "column",
              gap: GAP,
            }}
            onPointerLeave={() => setTip(null)}
          >
            {Array.from({ length: offset }, (_, i) => (
              <div key={`pad-${i}`} aria-hidden />
            ))}
            {days.map((day, i) => {
              const { title, detail } = describe(day);
              return (
                <div
                  key={day.date}
                  ref={(el) => {
                    cells.current[i] = el;
                  }}
                  role="img"
                  data-heat={day.level}
                  data-date={day.date}
                  tabIndex={i === active ? 0 : -1}
                  aria-label={`${title}: ${detail}${day.future || day.eligible === 0 ? "" : `, level ${LEVEL_NAMES[day.level]}`}`}
                  onPointerEnter={() => show(i)}
                  onFocus={() => {
                    setActive(i);
                    show(i);
                  }}
                  onBlur={() => setTip(null)}
                  onKeyDown={(event) => onKeyDown(event, i)}
                  className={`rounded-[3px] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-foreground ${day.future ? "opacity-40" : ""}`}
                  style={{ background: `var(--hm-${day.level})` }}
                />
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2 text-xs text-muted" aria-hidden>
        <span>Sedikit</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <span key={level} data-heat={level} className="size-3 rounded-[3px]" style={{ background: `var(--hm-${level})` }} />
        ))}
        <span>Sempurna</span>
        <span className="ml-3">Abu-abu: 0% atau tidak ada habit aktif</span>
      </div>

      {tip && (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-md"
          style={{ left: tip.x, top: tip.y - 8 }}
        >
          <p className="font-semibold">{tip.detail}</p>
          <p className="text-xs text-muted">{tip.title}</p>
        </div>
      )}
    </div>
  );
}
