import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/setup/global-setup.ts"],
    env: { DATABASE_URL: "file:./data/test.db" },
    // Test layanan berbagi satu file SQLite, sehingga berkas dijalankan berurutan.
    fileParallelism: false,
  },
});
