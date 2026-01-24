// Queue Dashboard - Bull Board integration
// Provides visual job queue management at /admin/queues

import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { HonoAdapter } from '@bull-board/hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { scrapeQueue } from '../../jobs/queue.js';

// Create Hono adapter with static file serving
const serverAdapter = new HonoAdapter(serveStatic);
serverAdapter.setBasePath('/api/admin/queues');

// Register scrape queue with bull-board
createBullBoard({
  queues: [new BullMQAdapter(scrapeQueue)],
  serverAdapter,
});

export const queueDashboard = serverAdapter.registerPlugin();
