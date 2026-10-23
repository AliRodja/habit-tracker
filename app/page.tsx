import { CalendarDays, HelpCircle, Sprout } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { TodayChecklist } from "@/components/tracker/today-checklist";
import { EmptyState } from "@/components/ui/empty-state";
import { Loading } from "@/components/ui/loading";
import { PageHeader } from "@/components/ui/page-header";
import { btnPrimary } from "@/components/ui/styles";
import { getTodayItems } from "@/lib/services/dashboard-service";
import { getToday } from "@/lib/services/settings-service";

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Hari Ini" description="Ketuk kartu kebiasaan yang sudah Anda lakukan hari ini. Ketuk lagi untuk membatalkan." />
      <Suspense fallback={<Loading />}>
        <TodayContent />
      </Suspense>
    </>
  );
}

async function TodayContent() {
  const today = await getToday();
  const items = await getTodayItems(today);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Sprout}
        title="Belum ada habit aktif"
        description="Mulai dengan satu kebiasaan kecil, misalnya minum air 8 gelas atau membaca 10 halaman."
        action={
          <Link href="/habits?baru=1" className={btnPrimary}>
            Buat habit pertama
          </Link>
        }
      />
    );
  }

  return (
    <div className="grid gap-6">
      <TodayChecklist items={items} today={today} />

      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <Link href="/tracker" className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 hover:border-accent/50">
          <CalendarDays className="size-5 shrink-0 text-accent-text" aria-hidden />
          <span>
            <span className="block font-medium">Lupa mencatat kemarin?</span>
            <span className="text-muted">Isi hari-hari sebelumnya di Tracker.</span>
          </span>
        </Link>
        <details className="group rounded-2xl border border-border bg-surface p-4">
          <summary className="flex cursor-pointer list-none items-center gap-3">
            <HelpCircle className="size-5 shrink-0 text-accent-text" aria-hidden />
            <span>
              <span className="block font-medium">Kenapa 66 hari?</span>
              <span className="text-muted group-open:hidden">Ketuk untuk membaca penjelasannya.</span>
            </span>
          </summary>
          <p className="mt-3 text-muted">
            Penelitian Lally dkk. (2010) menemukan bahwa rata-rata sebuah kebiasaan menjadi otomatis setelah sekitar 66 hari,
            dengan rentang 18–254 hari tergantung orangnya. Melewatkan satu hari tidak menggagalkan proses, jadi yang dihitung
            adalah total hari yang tercentang, bukan hanya hari beruntun.
          </p>
        </details>
      </div>
    </div>
  );
}
