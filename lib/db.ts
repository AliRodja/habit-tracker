import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "./generated/prisma/client";

const DEFAULT_DATABASE_URL = "file:./data/habits.db";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
}

// Satu instance per proses; di mode dev disimpan di globalThis agar HMR tidak membuat koneksi baru.
export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
