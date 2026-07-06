import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { config } from "../config.js";
import { rootLogger } from "../lib/logger.js";
import { dbPoolTotal, dbPoolIdle } from "../lib/metrics.js";
import * as schema from "./schema.js";

const POOL_WARN_THRESHOLD = 5;
let totalConnections = 0;
const seenConnections = new Set<number>();

// Strip ?sslmode=require from URL — postgres.js handles SSL via the ssl option
const dbUrl = config.DATABASE_URL.replace(/\?.*$/, "");
const isLocal = dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1");

const client = postgres(dbUrl, {
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: 3,
  idle_timeout: 20,
  connect_timeout: 30,
  debug(connId: number) {
    if (!seenConnections.has(connId)) {
      seenConnections.add(connId);
      totalConnections++;
      dbPoolTotal.set(totalConnections);
    }
  },
  onclose(connId: number) {
    seenConnections.delete(connId);
    totalConnections = seenConnections.size;
    dbPoolTotal.set(totalConnections);
    dbPoolIdle.set(Math.min(totalConnections, totalConnections));
  },
});

export const db = drizzle(client, { schema });
export const pgClient = client;

let poolLogInterval: ReturnType<typeof setInterval> | undefined;

export function startPoolMetrics(intervalMs = 30_000): void {
  if (poolLogInterval) return;
  poolLogInterval = setInterval(() => {
    const total = totalConnections;
    const max = (client.options.max as number) ?? 10;
    rootLogger.info({ event: "db_pool_stats", total, max }, "DB pool stats");
    if (total >= max - POOL_WARN_THRESHOLD) {
      rootLogger.warn({ event: "db_pool_pressure", total, max }, "DB pool near capacity");
    }
  }, intervalMs);
  poolLogInterval.unref?.();
}

export function stopPoolMetrics(): void {
  if (poolLogInterval) {
    clearInterval(poolLogInterval);
    poolLogInterval = undefined;
  }
}
