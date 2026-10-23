import type { ReactNode } from "react";

interface Props {
  /** Id judul untuk aria-labelledby; wajib bila `title` diisi. */
  id?: string;
  title?: string;
  description?: ReactNode;
  actions?: ReactNode;
  tone?: "default" | "danger";
  className?: string;
  children: ReactNode;
}

/** Wadah konten dengan judul dan deskripsi opsional. */
export function Card({ id, title, description, actions, tone = "default", className = "", children }: Props) {
  return (
    <section
      aria-labelledby={title ? id : undefined}
      className={`min-w-0 rounded-2xl border bg-surface p-4 shadow-sm shadow-black/[0.02] sm:p-5 ${tone === "danger" ? "border-danger/40" : "border-border"} ${className}`}
    >
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && (
              <h2 id={id} className={`text-base font-semibold ${tone === "danger" ? "text-danger" : ""}`}>
                {title}
              </h2>
            )}
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
