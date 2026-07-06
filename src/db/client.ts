import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { config } from "../config.js";
import { rootLogger } from "../lib/logger.js";
import { dbPoolTotal, dbPoolIdle } from "../lib/metrics.js";
import * as schema from "./schema.js";

const POOL_WARN_THRESHOLD = 5;

let totalConnections = 0;
const seenConnections = new Set<number>();

const client = postgres(config.DATABASE_URL, {
  ssl: config.DATABASE_URL.includes("localhost") ? false : "require",
  max: 3,
  idle_timeout: 20,
  connect_timeout: 10,
  debug(connId) {
    if (!seenConnections.has(connId)) {
      seenConnections.add(connId);
      totalConnections++;
      dbPoolTotal.set(totalConnections);
    }
  },
  onclose(connId) {
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
    const max = client.options.max as number;
    rootLogger.info({ event: "db_pool_stats", total, max }, "DB pool stats");
    if (total >= max - POOL_WARN_THRESHOLD) {
      rootLogger.warn(
        { event: "db_pool_pressure", total, max, threshold: POOL_WARN_THRESHOLD },
        "DB pool near capacity",
      );
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