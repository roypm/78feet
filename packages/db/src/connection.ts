import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema.ts";
export function connect(url: string) {
  if (!url) throw new Error("DATABASE_URL is required");
  const pool = new pg.Pool({
    connectionString: url,
    max: 8,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
  });
  // pg removes broken idle connections. Handle their error event so the API
  // stays alive, reports readiness 503 and reconnects when PostgreSQL returns.
  // Checked-out request/transaction failures still reject their own promises.
  pool.on("error", () => {});
  return { db: drizzle(pool, { schema }), pool, close: () => pool.end() };
}
export type Database = Omit<ReturnType<typeof connect>["db"], "$client">;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
