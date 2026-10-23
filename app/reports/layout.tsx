import { ReportTabs } from "@/components/reports/report-tabs";

export default function ReportsLayout({ children }: LayoutProps<"/reports">) {
  return (
    <div>
      <ReportTabs />
      <div className="mt-6">{children}</div>
    </div>
  );
}
