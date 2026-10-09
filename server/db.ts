import { Pool } from "pg";

declare global {
  // Reuse the connection pool across serverless warm invocations.
  // eslint-disable-next-line no-var
  var __vivoSpinPgPool: Pool | undefined;
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not configured.");
}

export const db =
  globalThis.__vivoSpinPgPool ??
  new Pool({
    connectionString,
    max: Number(process.env.PG_POOL_MAX ?? 5),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
    ssl: process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: true },
  });

if (process.env.NODE_ENV !== "production") globalThis.__vivoSpinPgPool = db;
