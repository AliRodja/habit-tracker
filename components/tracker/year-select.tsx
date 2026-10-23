"use client";

import { useRouter } from "next/navigation";

interface Props {
  years: number[];
  value: number;
  /** Membentuk URL tujuan untuk tahun yang dipilih. */
  hrefs: Record<number, string>;
}

export function YearSelect({ years, value, hrefs }: Props) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted">Tahun</span>
      <select
        value={value}
        onChange={(event) => router.push(hrefs[Number(event.target.value)])}
        className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-foreground"
      >
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </label>
  );
}
