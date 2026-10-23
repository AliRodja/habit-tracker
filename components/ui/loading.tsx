/** Kerangka pemuatan ringan untuk fallback <Suspense>. */
export function Loading({ label = "Memuat…" }: { label?: string }) {
  return (
    <div className="grid gap-3" aria-busy="true">
      <p className="sr-only">{label}</p>
      <div className="h-24 animate-pulse rounded-2xl bg-surface-2" />
      <div className="h-40 animate-pulse rounded-2xl bg-surface-2" />
    </div>
  );
}
