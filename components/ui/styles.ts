/** Kelas bersama untuk tombol dan input. Warna memakai token peran dari globals.css. */
const base =
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50";

export const btnPrimary = `${base} h-9 px-4 bg-accent text-accent-foreground shadow-sm hover:bg-accent/90`;
export const btnSecondary = `${base} h-9 px-3 border border-border bg-surface hover:bg-surface-2`;
export const btnGhost = `${base} h-9 px-3 text-muted hover:bg-surface-2 hover:text-foreground`;
export const btnDanger = `${base} h-9 px-4 bg-danger text-white shadow-sm hover:bg-danger/90 dark:text-stone-950`;
export const btnIcon = `${base} size-9 shrink-0 border border-border bg-surface text-foreground hover:bg-surface-2`;

export const inputClass =
  "block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted/70 focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent/30 aria-[invalid=true]:border-danger";

export const labelClass = "mb-1.5 block text-sm font-medium";
