import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Habit" };

export default function Page() {
  return <PagePlaceholder title="Habit" description="Kelola habit dan arsip (Fase 2)." />;
}
