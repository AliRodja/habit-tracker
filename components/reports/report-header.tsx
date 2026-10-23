import { PageHeader } from "@/components/ui/page-header";
import { SegmentedNav } from "@/components/ui/segmented-nav";

const TABS = [
  { key: "weekly", href: "/reports/weekly", label: "Mingguan" },
  { key: "monthly", href: "/reports/monthly", label: "Bulanan" },
  { key: "yearly", href: "/reports/yearly", label: "Tahunan" },
] as const;

/** Judul halaman laporan beserta tab jenis laporan. */
export function ReportHeader({ active, title, description }: { active: (typeof TABS)[number]["key"]; title: string; description: string }) {
  return (
    <PageHeader title={title} description={description}>
      <SegmentedNav label="Jenis laporan" items={TABS.map((tab) => ({ href: tab.href, label: tab.label, active: tab.key === active }))} />
    </PageHeader>
  );
}
