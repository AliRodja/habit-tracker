import { defineConfig, env } from "prisma/config";

// Prisma CLI tidak memuat .env otomatis; Next.js memuatnya sendiri saat runtime.
try {
  process.loadEnvFile();
} catch {
  // .env tidak wajib ada jika DATABASE_URL sudah diset di environment
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
