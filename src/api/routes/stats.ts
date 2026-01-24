// src/api/routes/stats.ts
/**
 * Stats API Route
 *
 * Returns dashboard statistics: total assets, last sync time, and recent updates.
 */
import { Hono } from 'hono';
import { db } from '../../db/client.js';
import { assets, channels, assetVersions } from '../../db/schema.js';
import { count, max, desc, eq } from 'drizzle-orm';

const app = new Hono();

/**
 * GET /stats
 *
 * Returns dashboard statistics.
 *
 * @example
 * GET /api/stats
 *
 * Response:
 * {
 *   ok: true,
 *   data: {
 *     totalAssets: 42,
 *     lastSyncAt: "2026-01-24T10:30:00.000Z",
 *     recentAssets: [...]
 *   }
 * }
 */
app.get('/', async (c) => {
  // Get total asset count
  const [{ totalAssets }] = await db
    .select({ totalAssets: count() })
    .from(assets);

  // Get last sync timestamp from channels
  const [{ lastSyncAt }] = await db
    .select({ lastSyncAt: max(channels.lastSyncAt) })
    .from(channels);

  // Get 5 most recent asset versions with asset info
  // Use assetVersions.id (not assets.id) to ensure unique keys for React rendering
  const recentVersions = await db
    .select({
      id: assetVersions.id,
      name: assets.rawName,
      version: assetVersions.version,
      createdAt: assetVersions.createdAt,
    })
    .from(assetVersions)
    .innerJoin(assets, eq(assetVersions.assetId, assets.id))
    .orderBy(desc(assetVersions.createdAt))
    .limit(5);

  const recentAssets = recentVersions.map((r) => ({
    id: r.id,
    name: r.name,
    version: r.version,
    createdAt: r.createdAt?.toISOString() ?? null,
  }));

  return c.json({
    ok: true,
    data: {
      totalAssets,
      lastSyncAt: lastSyncAt?.toISOString() ?? null,
      recentAssets,
    },
  });
});

export default app;
