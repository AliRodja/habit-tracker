import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Laporan Tahunan" };

export default function Page() {
  return <PagePlaceholder title="Laporan Tahunan" description="Laporan tahunan dan heatmap (Fase 5)." />;
}
