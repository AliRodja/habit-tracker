import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Pengaturan" };

export default function Page() {
  return <PagePlaceholder title="Pengaturan" description="Pengaturan, ekspor/impor, dan zona bahaya (Fase 6)." />;
}
