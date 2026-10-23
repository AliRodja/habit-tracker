import { BookOpen } from "lucide-react";

const TERMS = [
  ["Tingkat penyelesaian", "Jumlah centang dibagi jumlah centang yang mungkin. Habit yang belum dimulai atau sudah diarsipkan pada hari itu tidak dihitung."],
  ["Hari sempurna", "Hari ketika semua habit yang berjalan saat itu tercentang."],
  ["Hari aktif", "Hari dengan minimal satu centang."],
  ["Streak terpanjang", "Rangkaian hari berturut-turut terpanjang sebuah habit dicentang."],
  ["Kosong vs 0%", "Kolom kosong berarti belum ada habit yang berjalan; 0% berarti ada habit tetapi belum dicentang."],
] as const;

/** Penjelasan istilah laporan dalam bahasa sehari-hari. */
export function ReportGlossary() {
  return (
    <details className="rounded-2xl border border-border bg-surface p-4 text-sm">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-medium">
        <BookOpen className="size-4 text-accent-text" aria-hidden /> Cara membaca laporan
      </summary>
      <dl className="mt-3 grid gap-2.5">
        {TERMS.map(([term, meaning]) => (
          <div key={term}>
            <dt className="font-medium">{term}</dt>
            <dd className="text-muted">{meaning}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
