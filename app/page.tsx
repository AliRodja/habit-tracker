import Link from "next/link";
import { Suspense } from "react";
import { TodayChecklist } from "@/components/tracker/today-checklist";
import { formatDayLong } from "@/lib/format";
import { getTodayItems } from "@/lib/services/dashboard-service";
import { getToday } from "@/lib/services/settings-service";

export default function DashboardPage() {
  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">Hari Ini</h1>
      <Suspense fallback={<p className="mt-2 text-muted">Memuat…</p>}>
        <TodayContent />
      </Suspense>
    </section>
  );
}

async function TodayContent() {
  const today = await getToday();
  const items = await getTodayItems(today);

  return (
    <>
      <p className="mt-1 text-muted">{formatDayLong(today)}</p>
      {items.length === 0 ? (
        <p className="mt-6 text-muted">
          Belum ada habit aktif.{" "}
          <Link href="/habits" className="underline underline-offset-2">
            Tambahkan habit pertama Anda
          </Link>
          .
        </p>
      ) : (
        <TodayChecklist items={items} today={today} />
      )}
    </>
  );
}
