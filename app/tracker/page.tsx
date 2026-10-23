import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Tracker" };

export default function Page() {
  return <PagePlaceholder title="Tracker" description="Grid bulanan dan tahunan (Fase 3)." />;
}
