import { defineConfig } from "@playwright/test";

const PORT = 3100;
const DATABASE_URL = "file:./data/e2e.db";

export default defineConfig({
  testDir: "./e2e",
  // Semua skenario berbagi satu database e2e, jadi dijalankan berurutan.
  workers: 1,
  fullyParallel: false,
  reporter: "list",
  use: { baseURL: `http://127.0.0.1:${PORT}`, locale: "id-ID", timezoneId: "Asia/Jakarta" },
  webServer: {
    // Database e2e dibuat ulang tepat sebelum server menyala, terpisah dari data/habits.db.
    command: `sh -c "rm -f data/e2e.db* && prisma migrate deploy && next dev -H 127.0.0.1 -p ${PORT}"`,
    url: `http://127.0.0.1:${PORT}`,
    env: { DATABASE_URL },
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
