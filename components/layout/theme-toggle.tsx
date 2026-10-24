"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore, useTransition } from "react";
import { setTheme } from "@/lib/actions/settings-actions";
import { applyTheme } from "@/lib/theme";

type Mode = "light" | "dark";

const DARK_QUERY = "(prefers-color-scheme: dark)";

/** Tema yang sedang tampil: pilihan eksplisit di <html data-theme>, atau mengikuti OS bila "sistem". */
function currentMode(): Mode {
  const explicit = document.documentElement.dataset.theme;
  if (explicit === "light" || explicit === "dark") return explicit;
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener("change", onChange);
  return () => {
    observer.disconnect();
    media.removeEventListener("change", onChange);
  };
}

/**
 * Tombol cepat mode terang/gelap. Tema langsung diterapkan di browser, lalu disimpan ke database (sumber
 * kebenaran yang sama dengan Pengaturan). Server belum tahu tema yang tampil, jadi render awal memakai "light".
 */
export function ThemeToggle({ variant }: { variant: "icon" | "row" }) {
  const mode = useSyncExternalStore(subscribe, currentMode, () => "light" as Mode);
  const [pending, startTransition] = useTransition();
  const next: Mode = mode === "dark" ? "light" : "dark";

  function toggle() {
    applyTheme(next);
    startTransition(async () => {
      await setTheme(next);
    });
  }

  const label = next === "dark" ? "Mode gelap" : "Mode terang";
  const Icon = next === "dark" ? Moon : Sun;

  if (variant === "row") {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={next === "dark" ? "Ganti ke mode gelap" : "Ganti ke mode terang"}
        aria-busy={pending || undefined}
        className="mt-auto mb-3 hidden w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-accent md:flex"
      >
        <Icon className="size-4" aria-hidden />
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={next === "dark" ? "Ganti ke mode gelap" : "Ganti ke mode terang"}
      title={label}
      aria-busy={pending || undefined}
      className="ml-auto flex size-10 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-accent md:hidden"
    >
      <Icon className="size-5" aria-hidden />
    </button>
  );
}
