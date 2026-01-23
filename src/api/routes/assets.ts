// src/api/routes/assets.ts
/**
 * Asset API Routes
 *
 * Exposes asset search and detail endpoints for web dashboard and Slack bot.
 * All endpoints return consistent JSON responses.
 */
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { searchAssets, getAssetDetail } from '../../services/query/index.js';

const app = new Hono();

/**
 * Query schema for search endpoint
 */
const searchSchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  category: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(10),
});

/**
 * GET /assets/search
 *
 * Search assets by name with fuzzy matching.
 * Query params: q (required), category (optional), limit (optional, default 10)
 *
 * @example
 * GET /api/assets/search?q=ho+ly
 * GET /api/assets/search?q=theme&category=sound&limit=5
 */
app.get('/search', zValidator('query', searchSchema), async (c) => {
  const { q, category, limit } = c.req.valid('query');

  const { results, matchType } = await searchAssets({
    query: q,
    category,
    limit,
  });

  return c.json({
    ok: true,
    data: results,
    query: q,
    matchType,
  });
});

/**
 * GET /assets/:id
 *
 * Get asset detail with version history.
 * Returns 404 if asset not found.
 *
 * @example
 * GET /api/assets/550e8400-e29b-41d4-a716-446655440000
 */
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const asset = await getAssetDetail(id);

  if (!asset) {
    return c.json(
      { ok: false, data: null, error: 'Asset not found' },
      404
    );
  }

  return c.json({ ok: true, data: asset });
});

export default app;
