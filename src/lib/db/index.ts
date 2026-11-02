import "server-only";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const url = process.env.DATABASE_URL ?? "file:./data/tram-nam.db";

const globalForDb = globalThis as unknown as { __tramNamClient?: ReturnType<typeof createClient> };

const client =
  globalForDb.__tramNamClient ??
  createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN || undefined });

if (process.env.NODE_ENV !== "production") globalForDb.__tramNamClient = client;

export const db = drizzle(client, { schema });
export { schema };
