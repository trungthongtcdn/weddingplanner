import "server-only";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";

type Db = LibSQLDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __tramNamClient?: Client; __tramNamDb?: Db };

/**
 * Mở kết nối khi có truy vấn đầu tiên, không mở lúc import:
 * bước `next build` nạp các module này để thu thập cấu hình trang, lúc đó chưa có thư mục dữ liệu.
 */
function getDb(): Db {
  if (globalForDb.__tramNamDb) return globalForDb.__tramNamDb;
  const url = process.env.DATABASE_URL || "file:./data/tram-nam.db";
  if (url.startsWith("file:")) {
    const path = url.slice("file:".length);
    if (path && path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  }
  const client = globalForDb.__tramNamClient ?? createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN || undefined });
  globalForDb.__tramNamClient = client;
  globalForDb.__tramNamDb = drizzle(client, { schema });
  return globalForDb.__tramNamDb;
}

export const db = new Proxy({} as Db, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export { schema };
