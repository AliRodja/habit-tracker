import type { HabitColor } from "@/lib/constants";

/** Nama kelas ditulis utuh agar terdeteksi Tailwind. Warna tidak pernah menjadi satu-satunya penanda (NFR-07). */
export const HABIT_COLOR_STYLES: Record<HabitColor, { label: string; dot: string }> = {
  emerald: { label: "Hijau", dot: "bg-emerald-500" },
  sky: { label: "Biru muda", dot: "bg-sky-500" },
  violet: { label: "Ungu", dot: "bg-violet-500" },
  amber: { label: "Kuning", dot: "bg-amber-500" },
  rose: { label: "Merah muda", dot: "bg-rose-500" },
  teal: { label: "Hijau tosca", dot: "bg-teal-500" },
  orange: { label: "Oranye", dot: "bg-orange-500" },
  indigo: { label: "Nila", dot: "bg-indigo-500" },
};

export function colorDot(color: string): string {
  return HABIT_COLOR_STYLES[color as HabitColor]?.dot ?? "bg-stone-400";
}
