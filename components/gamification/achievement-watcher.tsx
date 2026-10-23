"use client";

import { Trophy, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "ht-seen-achievements";

interface Unlocked {
  id: string;
  title: string;
}

function readSeen(): string[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : null;
  } catch {
    return null;
  }
}

function writeSeen(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // penyimpanan tidak tersedia: notifikasi bisa muncul ulang, tidak berbahaya
  }
}

/**
 * FR-24: kabarkan pencapaian yang baru terbuka. Daftar yang sudah dilihat disimpan di localStorage; kunjungan
 * pertama hanya mencatat tanpa menampilkan notifikasi agar pengguna lama tidak dibanjiri.
 */
export function AchievementWatcher({ unlocked }: { unlocked: Unlocked[] }) {
  const [fresh, setFresh] = useState<Unlocked[]>([]);
  const signature = unlocked.map((a) => a.id).join(",");

  useEffect(() => {
    const ids = signature ? signature.split(",") : [];
    const seen = readSeen();
    writeSeen([...new Set([...(seen ?? []), ...ids])]);
    if (seen === null) return;
    const newOnes = unlocked.filter((a) => !seen.includes(a.id));
    if (newOnes.length === 0) return;
    // Ditunda satu tick: efek hanya menyinkronkan localStorage, tampilan diperbarui setelahnya.
    const timer = setTimeout(() => setFresh(newOnes), 0);
    return () => clearTimeout(timer);
    // `unlocked` diwakili oleh `signature` agar efek tidak berjalan ulang pada setiap render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  useEffect(() => {
    if (fresh.length === 0) return;
    const timer = setTimeout(() => setFresh([]), 8000);
    return () => clearTimeout(timer);
  }, [fresh]);

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-24 z-50 flex justify-end md:bottom-6">
      {fresh.length > 0 && (
        <div className="pointer-events-auto flex w-full max-w-sm animate-[pop-in_0.3s_ease-out] items-start gap-3 rounded-2xl border border-amber-300/60 bg-surface p-4 shadow-lg dark:border-amber-500/30">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-linear-to-b from-amber-300 to-orange-500 text-white" aria-hidden>
            <Trophy className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Pencapaian baru!</p>
            <p className="text-sm text-muted">{fresh.map((a) => a.title).join(", ")}</p>
            <Link href="/pencapaian" className="mt-1 inline-block text-sm font-medium text-accent-text underline underline-offset-2">
              Lihat pencapaian
            </Link>
          </div>
          <button type="button" onClick={() => setFresh([])} className="-m-1 rounded-lg p-1 text-muted hover:bg-surface-2" aria-label="Tutup notifikasi">
            <X className="size-4" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
