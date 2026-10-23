import type { ReactNode } from "react";

interface Props {
  title: string;
  /** Satu kalimat yang menjelaskan kegunaan halaman bagi pengguna baru. */
  description?: ReactNode;
  /** Tombol aksi utama halaman, ditaruh di kanan judul. */
  actions?: ReactNode;
  /** Konten di bawah judul, mis. tab. */
  children?: ReactNode;
}

export function PageHeader({ title, description, actions, children }: Props) {
  return (
    <header className="mb-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-muted">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </header>
  );
}
