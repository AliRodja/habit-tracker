"use client";

import { btnPrimary } from "@/components/ui/styles";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <section role="alert">
      <h1 className="text-2xl font-semibold tracking-tight">Terjadi kesalahan</h1>
      <p className="mt-2 text-muted">{error.message || "Terjadi kesalahan yang tidak terduga."}</p>
      <button type="button" onClick={reset} className={`${btnPrimary} mt-4`}>
        Coba lagi
      </button>
    </section>
  );
}
