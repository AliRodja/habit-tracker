import { Gift, Shield } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { AchievementCard } from "@/components/gamification/achievement-card";
import { HabitMedals } from "@/components/gamification/habit-medals";
import { WeeklyChallenges } from "@/components/gamification/weekly-challenges";
import { Notice } from "@/components/ui/notice";
import { FlameBadge } from "@/components/gamification/flame-badge";
import { StatTile } from "@/components/reports/stat-tile";
import { Card } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import { PageHeader } from "@/components/ui/page-header";
import { CHALLENGE_BONUS, FLAME_TIERS, flameTier, PERFECT_DAY_BONUS, SHIELD_EVERY_DAYS, SHIELD_MAX, XP_PER_CHECK, type AchievementGroup } from "@/lib/gamification";
import { getGamification } from "@/lib/services/gamification-service";
import { getToday } from "@/lib/services/settings-service";

export const metadata: Metadata = { title: "Pencapaian" };

const GROUPS: { title: string; groups: AchievementGroup[] }[] = [
  { title: "Langkah awal", groups: ["start"] },
  { title: "Api beruntun", groups: ["flame"] },
  { title: "Konsistensi", groups: ["perfect", "active", "formed"] },
  { title: "Kerja keras", groups: ["checks", "level", "challenge"] },
];

export default function AchievementsPage() {
  return (
    <>
      <PageHeader title="Pencapaian" description="Jaga api tetap menyala, kumpulkan XP, dan buka lencana dari konsistensi Anda setiap hari." />
      <Suspense fallback={<Loading />}>
        <AchievementsContent />
      </Suspense>
    </>
  );
}

async function AchievementsContent() {
  const today = await getToday();
  const game = await getGamification(today);
  const { flame, level } = game;
  const tier = flameTier(flame.streak);
  const unlocked = game.achievements.filter((a) => a.unlockedAt !== null).length;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      {!game.enabled && (
        <Notice>
          Gamifikasi sedang dimatikan, jadi api, XP, dan perayaan tidak tampil di Hari Ini. Progres Anda tetap dihitung.{" "}
          <Link href="/settings#umum" className="font-medium text-accent-text underline underline-offset-2">
            Aktifkan di Pengaturan
          </Link>
          .
        </Notice>
      )}

      <section aria-label="Ringkasan" className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm shadow-black/[0.02] sm:p-5">
        <FlameBadge streak={flame.streak} lit={flame.litToday} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted">Tingkat api: {tier.name}</p>
          <p className="text-2xl font-bold tracking-tight">{flame.streak} hari beruntun</p>
          <p className="text-sm text-muted">
            Rekor terpanjang {flame.longest} hari · {flame.litToday ? "api hari ini sudah menyala" : "centang satu kebiasaan hari ini agar api tetap menyala"}
          </p>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Level" value={String(level.level)} note={`${level.current} / ${level.needed} XP ke level ${level.level + 1}`} />
        <StatTile label="Total XP" value={game.xp.total.toLocaleString("id-ID")} note={`+${game.xp.today} XP hari ini`} />
        <StatTile label="Pelindung api" value={`${flame.shields} / ${SHIELD_MAX}`} note={`Terpakai ${flame.shieldsUsed} kali`} />
        <StatTile label="Lencana" value={`${unlocked} / ${game.achievements.length}`} note="Terbuka" />
      </div>

      <Card id="rules-title" title="Cara mendapatkan hadiah" description="Semua dihitung otomatis dari centang Anda, termasuk yang diisi belakangan di Tracker.">
        <div className="grid gap-4 text-sm sm:grid-cols-2">
          <ul className="grid gap-2">
            <li className="flex gap-2">
              <Gift className="mt-0.5 size-4 shrink-0 text-accent-text" aria-hidden />
              <span>
                <strong>+{XP_PER_CHECK} XP</strong> setiap kebiasaan yang selesai.
              </span>
            </li>
            <li className="flex gap-2">
              <Gift className="mt-0.5 size-4 shrink-0 text-accent-text" aria-hidden />
              <span>
                <strong>+{PERFECT_DAY_BONUS} XP bonus</strong> saat semua kebiasaan hari itu selesai (Hari Sempurna).
              </span>
            </li>
            <li className="flex gap-2">
              <Gift className="mt-0.5 size-4 shrink-0 text-accent-text" aria-hidden />
              <span>
                <strong>Api menyala</strong> bila minimal satu kebiasaan dicentang hari itu. Hari ini yang belum diisi tidak memadamkan api.
              </span>
            </li>
            <li className="flex gap-2">
              <Gift className="mt-0.5 size-4 shrink-0 text-accent-text" aria-hidden />
              <span>
                <strong>+{CHALLENGE_BONUS} XP</strong> untuk setiap tantangan mingguan yang selesai.
              </span>
            </li>
            <li className="flex gap-2">
              <Shield className="mt-0.5 size-4 shrink-0 text-accent-text" aria-hidden />
              <span>
                Setiap <strong>{SHIELD_EVERY_DAYS} hari beruntun</strong> memberi 1 pelindung (maksimal {SHIELD_MAX}). Bila suatu hari terlewat, pelindung
                dipakai otomatis sehingga api tetap menyala, sebab melewatkan satu hari tidak menggagalkan pembentukan kebiasaan.
              </span>
            </li>
          </ul>
          <div>
            <p className="mb-2 font-medium">Tingkatan api</p>
            <ol className="grid gap-1.5">
              {FLAME_TIERS.slice(1).map((t) => (
                <li key={t.name} className="flex items-center gap-2">
                  <FlameBadge streak={t.min} lit size="sm" />
                  <span className={t.name === tier.name ? "font-semibold" : ""}>
                    {t.name} <span className="text-muted">· {t.min} hari{t.name === tier.name ? " (sekarang)" : ""}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Card>

      {game.week && game.week.challenges.length > 0 && (
        <WeeklyChallenges challenges={game.week.challenges} end={game.week.end} today={today} habitInfo={game.habitInfo} />
      )}

      <section aria-labelledby="medals-title">
        <h2 id="medals-title" className="font-semibold">
          Medali per habit
        </h2>
        <p className="mb-3 text-sm text-muted">Setiap habit mengumpulkan medalinya sendiri dari total hari tercentang.</p>
        {game.habitBadges.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted">Belum ada habit.</p>
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {game.habitBadges.map((badges) => {
              const info = game.habitInfo[badges.habitId];
              return <HabitMedals key={badges.habitId} badges={badges} name={info.name} color={info.color} archived={!info.isActive} />;
            })}
          </ul>
        )}
      </section>

      {GROUPS.map(({ title, groups }) => (
        <section key={title} aria-labelledby={`group-${groups[0]}`}>
          <h2 id={`group-${groups[0]}`} className="mb-3 font-semibold">
            {title}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {game.achievements
              .filter((a) => groups.includes(a.group))
              .map((a) => (
                <AchievementCard key={a.id} achievement={a} />
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
