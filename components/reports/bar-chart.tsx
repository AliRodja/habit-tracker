"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Rectangle,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type BarShapeProps,
} from "recharts";

export interface BarDatum {
  label: string;
  /** Persentase 0–100; null = tidak ada habit eligible (kolom kosong, bukan 0%). */
  value: number | null;
  /** Kolom yang menjadi pokok cerita memakai warna aksen; lainnya lebih redup (emphasis). */
  highlight?: boolean;
  /** Baris tambahan pada tooltip, mis. "5 dari 7". */
  detail?: string;
}

interface Props {
  data: BarDatum[];
  ariaLabel: string;
  height?: number;
  /** "vertical" = kolom ke atas; "horizontal" = bar mendatar (nama panjang). */
  orientation?: "vertical" | "horizontal";
  /** Beri label nilai di ujung hanya pada kolom yang disorot (atau semua bar mendatar). */
  labelHighlighted?: boolean;
}

const AXIS_TICK = { fill: "var(--chart-muted)", fontSize: 12 };
const PERCENT_TICKS = [0, 25, 50, 75, 100];
const pct = (v: number) => `${Math.round(v)}%`;

function Tooltip_({ active, payload }: { active?: boolean; payload?: { payload: BarDatum }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-sm">
      <p className="text-lg font-semibold leading-tight">{d.value === null ? "–" : pct(d.value)}</p>
      <p className="text-muted">{d.label}</p>
      {d.detail && <p className="text-xs text-muted">{d.detail}</p>}
    </div>
  );
}

function BarShape(props: BarShapeProps) {
  const datum = props.payload as BarDatum;
  return <Rectangle {...props} fill={datum.highlight ? "var(--chart-accent)" : "var(--chart-soft)"} />;
}

export function ReportBarChart({ data, ariaLabel, height = 220, orientation = "vertical", labelHighlighted = true }: Props) {
  const horizontal = orientation === "horizontal";
  const radius: [number, number, number, number] = horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0];

  return (
    <div role="img" aria-label={ariaLabel} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height }}>
        <BarChart
          data={data}
          layout={horizontal ? "vertical" : "horizontal"}
          margin={{ top: 18, right: horizontal ? 40 : 8, left: 0, bottom: 0 }}
          barCategoryGap="22%"
        >
          <CartesianGrid stroke="var(--chart-grid)" vertical={horizontal} horizontal={!horizontal} />
          {horizontal ? (
            <>
              <XAxis type="number" domain={[0, 100]} ticks={PERCENT_TICKS} tickFormatter={pct} tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: "var(--chart-axis)" }} />
              <YAxis type="category" dataKey="label" width={110} tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: "var(--chart-axis)" }} />
            </>
          ) : (
            <>
              <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: "var(--chart-axis)" }} interval={0} />
              <YAxis domain={[0, 100]} ticks={PERCENT_TICKS} tickFormatter={pct} tick={AXIS_TICK} tickLine={false} axisLine={false} width={44} />
            </>
          )}
          <Tooltip cursor={{ fill: "var(--chart-cursor)" }} content={<Tooltip_ />} isAnimationActive={false} />
          <Bar dataKey="value" maxBarSize={24} radius={radius} shape={BarShape} isAnimationActive={false}>
            <LabelList
              dataKey="value"
              position={horizontal ? "right" : "top"}
              content={({ x, y, width, height: h, value, index }) => {
                const datum = data[Number(index)];
                if (value === null || value === undefined || (!horizontal && labelHighlighted && !datum?.highlight)) return null;
                const cx = horizontal ? Number(x) + Number(width) + 6 : Number(x) + Number(width) / 2;
                const cy = horizontal ? Number(y) + Number(h) / 2 : Number(y) - 6;
                return (
                  <text x={cx} y={cy} textAnchor={horizontal ? "start" : "middle"} dominantBaseline={horizontal ? "central" : "auto"} fill="var(--color-foreground)" fontSize={12} fontWeight={600}>
                    {pct(Number(value))}
                  </text>
                );
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
