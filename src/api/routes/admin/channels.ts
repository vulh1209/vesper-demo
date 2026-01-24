// src/api/routes/admin/channels.ts
/**
 * Admin Channel Management API
 *
 * CRUD endpoints for managing tracked Slack channels.
 * All endpoints return consistent { ok, data } JSON responses.
 */
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../../../db/client.js';
import { channels, slackMessages } from '../../../db/schema.js';
import { eq, count } from 'drizzle-orm';
import {
  getConfiguredChannels,
  addChannel,
  removeChannel,
  getChannelWithStats,
} from '../../../config/channels.js';
import { runScrapeNow } from '../../../jobs/daily-scrape.js';

const app = new Hono();

/**
 * Schema for adding a new channel
 */
const addChannelSchema = z.object({
  id: z.string().regex(/^C[A-Z0-9]+$/, 'Invalid Slack channel ID format'),
  name: z.string().min(1).max(80),
});

/**
 * GET /
 *
 * List all configured channels with sync status and message counts.
 *
 * @example
 * GET /api/admin/channels
 */
app.get('/', async (c) => {
  const channelConfigs = await getConfiguredChannels();

  // Get full channel data with stats from database
  const channelList = await Promise.all(
    channelConfigs.map(async (config) => {
      const { channel, messageCount } = await getChannelWithStats(config.id);

      return {
        id: config.id,
        name: config.name,
        lastSyncTs: channel?.lastSyncTs ?? null,
        lastSyncAt: channel?.lastSyncAt ?? null,
        messageCount,
        createdAt: channel?.createdAt ?? null,
      };
    })
  );

  return c.json({ ok: true, data: channelList });
});

/**
 * POST /
 *
 * Add a new channel to track.
 *
 * @example
 * POST /api/admin/channels
 * { "id": "C1234567890", "name": "art-assets" }
 */
app.post('/', zValidator('json', addChannelSchema), async (c) => {
  const { id, name } = c.req.valid('json');

  await addChannel(id, name);

  const { channel, messageCount } = await getChannelWithStats(id);

  return c.json(
    {
      ok: true,
      data: {
        id,
        name,
        lastSyncTs: channel?.lastSyncTs ?? null,
        lastSyncAt: channel?.lastSyncAt ?? null,
        messageCount,
        createdAt: channel?.createdAt ?? null,
      },
    },
    201
  );
});

/**
 * DELETE /:id
 *
 * Remove a channel from tracking.
 * Returns 409 if channel has associated messages (data integrity protection).
 *
 * @example
 * DELETE /api/admin/channels/C1234567890
 */
app.delete('/:id', async (c) => {
  const id = c.req.param('id');

  // Check if channel has messages
  const { messageCount } = await getChannelWithStats(id);

  if (messageCount > 0) {
    return c.json(
      {
        ok: false,
        data: null,
        error: `Cannot delete channel with ${messageCount} messages. Delete messages first.`,
      },
      409
    );
  }

  const deleted = await removeChannel(id);

  if (!deleted) {
    return c.json(
      { ok: false, data: null, error: 'Channel not found' },
      404
    );
  }

  return c.body(null, 204);
});

/**
 * POST /:id/sync
 *
 * Trigger a manual scrape for a specific channel.
 *
 * @example
 * POST /api/admin/channels/C1234567890/sync
 */
app.post('/:id/sync', async (c) => {
  const id = c.req.param('id');

  // Verify channel exists
  const { channel } = await getChannelWithStats(id);

  if (!channel) {
    return c.json(
      { ok: false, data: null, error: 'Channel not found' },
      404
    );
  }

  const jobId = await runScrapeNow([id]);

  return c.json({
    ok: true,
    data: {
      jobId,
      channelId: id,
      message: 'Scrape job queued',
    },
  });
});

export default app;
