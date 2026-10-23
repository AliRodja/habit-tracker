import { Check } from "lucide-react";

const swatch = "relative flex size-6 shrink-0 items-center justify-center rounded-md border";

/** Penjelasan arti setiap jenis sel di Tracker, agar warna tidak perlu ditebak. */
export function GridLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
      <span className="flex items-center gap-2">
        <span className={`${swatch} border-transparent bg-accent text-white`} aria-hidden>
          <Check className="size-3.5" strokeWidth={3} />
        </span>
        Selesai
      </span>
      <span className="flex items-center gap-2">
        <span className={`${swatch} border-border bg-background`} aria-hidden />
        Belum
      </span>
      <span className="flex items-center gap-2">
        <span className={`${swatch} border-transparent bg-border/50`} aria-hidden />
        Tidak tersedia (sebelum mulai atau belum tiba)
      </span>
      <span className="flex items-center gap-2">
        <span className={`${swatch} border-border bg-background`} aria-hidden>
          <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full border border-surface bg-foreground" />
        </span>
        Ada catatan
      </span>
    </div>
  );
}
