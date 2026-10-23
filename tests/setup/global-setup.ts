import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

/** Siapkan SQLite khusus test (data/test.db) dengan migrasi terbaru. Tidak menyentuh data/habits.db. */
export default function setup() {
  for (const suffix of ["", "-journal", "-wal", "-shm"]) rmSync(`data/test.db${suffix}`, { force: true });
  execSync("npx prisma migrate deploy", {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: "file:./data/test.db" },
  });
}
