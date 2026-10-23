import path from "node:path";

/** Lokasi file SQLite absolut dari DATABASE_URL (FR-17), untuk ditampilkan di Pengaturan. */
export function resolveDatabasePath(url: string | undefined = process.env.DATABASE_URL): string {
  const raw = (url ?? "file:./data/habits.db").replace(/^file:/, "");
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), raw);
}
