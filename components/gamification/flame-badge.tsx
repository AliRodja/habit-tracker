import { Flame } from "lucide-react";
import { flameTier } from "@/lib/gamification";

/** Warna api per tingkatan (Padam → Api Abadi). Kelas ditulis utuh agar terdeteksi Tailwind. */
const TIER_GRADIENTS = [
  "from-stone-300 to-stone-400 dark:from-stone-600 dark:to-stone-700",
  "from-amber-300 to-amber-500",
  "from-amber-300 to-orange-500",
  "from-orange-400 to-orange-600",
  "from-orange-500 to-red-600",
  "from-red-500 to-rose-700",
  "from-fuchsia-500 to-violet-700",
];

const SIZES = {
  sm: { box: "size-9", icon: "size-5" },
  md: { box: "size-12", icon: "size-6" },
  lg: { box: "size-16 sm:size-20", icon: "size-8 sm:size-10" },
};

/** Lingkaran api. Dekoratif: tingkatan dan jumlah hari selalu ditulis sebagai teks di sebelahnya. */
export function FlameBadge({ streak, lit, size = "md" }: { streak: number; lit: boolean; size?: keyof typeof SIZES }) {
  const tier = flameTier(streak);
  const { box, icon } = SIZES[size];
  return (
    <span
      aria-hidden
      className={`relative flex shrink-0 items-center justify-center rounded-full bg-linear-to-b text-white shadow-sm ${box} ${TIER_GRADIENTS[tier.index]} ${
        lit ? "" : "opacity-50 grayscale"
      }`}
    >
      <Flame className={`${icon} ${lit && streak > 0 ? "animate-[flame-flicker_2.4s_ease-in-out_infinite]" : ""}`} fill="currentColor" strokeWidth={1.5} />
    </span>
  );
}
