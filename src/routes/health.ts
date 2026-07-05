import { Router, type Router as RouterType } from "express";
import { probeDatabase, probeSorobanRpc } from "../lib/probes.js";
import { overallReadinessStatus } from "../lib/readiness.js";
import { isAccepting } from "../lib/lifecycle.js";
import { db } from "../db/client.js";
import { sql } from "drizzle-orm";

const router: RouterType = Router();

router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "atriumind",
    timestamp: new Date().toISOString(),
  });
});

router.get("/health/ready", async (_req, res) => {
  if (!isAccepting()) {
    res.status(503).json({
      status: "shutting_down",
      service: "atriumind",
      timestamp: new Date().toISOString(),
    });
    return;
  }
  const [database, sorobanRpc] = await Promise.all([probeDatabase(), probeSorobanRpc()]);
  const checks = { database, sorobanRpc };
  const status = overallReadinessStatus(checks);
  const httpStatus = status === "ok" ? 200 : 503;
  res.status(httpStatus).json({
    status,
    service: "atriumind",
    checks,
    timestamp: new Date().toISOString(),
  });
});

// Debug endpoint — diagnose DB connection and query errors
router.get("/debug/db", async (_req, res) => {
  try {
    const pub = await db.execute(sql`SELECT count(*) as cnt FROM publishers`);
    const res2 = await db.execute(sql`SELECT count(*) as cnt FROM resources`);
    const cols = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'resources'
      ORDER BY ordinal_position
    `);
    res.json({
      status: "db_ok",
      publishers: pub.rows[0],
      resources: res2.rows[0],
      resource_columns: cols.rows,
    });
  } catch (err: any) {
    res.status(500).json({
      error: err.message,
      code: err.code,
      detail: err.detail,
    });
  }
});

export default router;
