const base =
  "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:cursor-not-allowed disabled:opacity-50";

export const btnPrimary = `${base} bg-foreground text-background hover:opacity-90`;
export const btnSecondary = `${base} border border-border bg-surface hover:bg-border`;
export const btnDanger = `${base} bg-red-600 text-white hover:bg-red-700`;
export const btnIcon = `${base} size-8 border border-border bg-surface p-0 hover:bg-border`;

export const inputClass =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-foreground aria-[invalid=true]:border-red-500";
