// Health Check API
// Checks connectivity to Redis and PostgreSQL

import { Hono } from 'hono';
import { connection as redisConnection } from '../../../jobs/queue.js';
import { db } from '../../../db/client.js';
import { sql } from 'drizzle-orm';

const app = new Hono();

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    redis: { status: 'up' | 'down'; latencyMs?: number; error?: string };
    database: { status: 'up' | 'down'; latencyMs?: number; error?: string };
  };
}

app.get('/', async (c) => {
  const timestamp = new Date().toISOString();
  const checks: HealthStatus['checks'] = {
    redis: { status: 'down' },
    database: { status: 'down' },
  };

  // Check Redis
  try {
    const start = Date.now();
    await redisConnection.ping();
    checks.redis = { status: 'up', latencyMs: Date.now() - start };
  } catch (err) {
    checks.redis = { status: 'down', error: (err as Error).message };
  }

  // Check PostgreSQL
  try {
    const start = Date.now();
    await db.execute(sql`SELECT 1`);
    checks.database = { status: 'up', latencyMs: Date.now() - start };
  } catch (err) {
    checks.database = { status: 'down', error: (err as Error).message };
  }

  // Determine overall status
  const allUp = checks.redis.status === 'up' && checks.database.status === 'up';
  const allDown = checks.redis.status === 'down' && checks.database.status === 'down';
  const status: HealthStatus['status'] = allUp ? 'healthy' : allDown ? 'unhealthy' : 'degraded';

  const response: HealthStatus = { status, timestamp, checks };

  // Return 503 if unhealthy for load balancer detection
  const httpStatus = status === 'unhealthy' ? 503 : 200;
  return c.json(response, httpStatus);
});

export default app;
