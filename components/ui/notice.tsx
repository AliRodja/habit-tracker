import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import type { ReactNode } from "react";

const TONES = {
  info: { icon: Info, className: "border-accent/25 bg-accent-soft text-foreground", iconClass: "text-accent-text" },
  success: { icon: CheckCircle2, className: "border-success/25 bg-success-soft text-foreground", iconClass: "text-success" },
  danger: { icon: AlertCircle, className: "border-danger/25 bg-danger-soft text-foreground", iconClass: "text-danger" },
} as const;

/** Pesan berwarna dengan ikon, sehingga makna tidak hanya disampaikan lewat warna (NFR-07). */
export function Notice({ tone = "info", children, className = "" }: { tone?: keyof typeof TONES; children: ReactNode; className?: string }) {
  const { icon: Icon, className: toneClass, iconClass } = TONES[tone];
  return (
    <div className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm ${toneClass} ${className}`}>
      <Icon className={`mt-0.5 size-4 shrink-0 ${iconClass}`} aria-hidden />
      <div className="min-w-0 break-words">{children}</div>
    </div>
  );
}

/** Teks status singkat di samping tombol form. Selalu dirender agar pembaca layar mengumumkan perubahannya. */
export function FormStatus({ status, message }: { status: "idle" | "success" | "error"; message?: string }) {
  return (
    <p role="status" aria-live="polite" className={`text-sm ${status === "error" ? "text-danger" : "text-success"}`}>
      {status !== "idle" && message}
    </p>
  );
}
