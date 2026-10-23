import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Laporan Mingguan" };

export default function Page() {
  return <PagePlaceholder title="Laporan Mingguan" description="Laporan mingguan (Fase 5)." />;
}
