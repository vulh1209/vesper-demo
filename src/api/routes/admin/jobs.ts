// src/api/routes/admin/jobs.ts
/**
 * Admin Job Queue API
 *
 * Endpoints for monitoring and controlling the scrape job queue.
 * All endpoints return consistent { ok, data } JSON responses.
 */
import { Hono } from 'hono';
import { scrapeQueue } from '../../../jobs/queue.js';
import { runScrapeNow, getSchedulerStatus } from '../../../jobs/daily-scrape.js';

const app = new Hono();

/**
 * GET /status
 *
 * Get queue health status including job counts, scheduler info, and pause state.
 *
 * @example
 * GET /api/admin/jobs/status
 */
app.get('/status', async (c) => {
  const counts = await scrapeQueue.getJobCounts(
    'wait',
    'active',
    'completed',
    'failed',
    'delayed'
  );
  const scheduler = await getSchedulerStatus();
  const isPaused = await scrapeQueue.isPaused();

  return c.json({
    ok: true,
    data: {
      counts,
      scheduler,
      isPaused,
    },
  });
});

/**
 * GET /recent
 *
 * Get last 10 completed and last 10 failed jobs.
 *
 * @example
 * GET /api/admin/jobs/recent
 */
app.get('/recent', async (c) => {
  const completed = await scrapeQueue.getJobs(['completed'], 0, 10, true);
  const failed = await scrapeQueue.getJobs(['failed'], 0, 10, true);

  const mapJob = (job: Awaited<ReturnType<typeof scrapeQueue.getJobs>>[number]) => ({
    id: job.id,
    name: job.name,
    finishedOn: job.finishedOn ? new Date(job.finishedOn) : null,
    failedReason: job.failedReason ?? null,
    data: job.data,
  });

  return c.json({
    ok: true,
    data: {
      completed: completed.map(mapJob),
      failed: failed.map(mapJob),
    },
  });
});

/**
 * POST /trigger
 *
 * Trigger an immediate scrape job.
 * Optionally specify channelIds to scrape specific channels.
 *
 * @example
 * POST /api/admin/jobs/trigger
 * POST /api/admin/jobs/trigger { "channelIds": ["C123", "C456"] }
 */
app.post('/trigger', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const channelIds = body.channelIds as string[] | undefined;

  const jobId = await runScrapeNow(channelIds);

  return c.json({
    ok: true,
    data: {
      jobId,
      channelIds: channelIds ?? 'all',
      message: 'Scrape job queued',
    },
  });
});

/**
 * POST /pause
 *
 * Pause the scrape queue. No new jobs will be processed.
 *
 * @example
 * POST /api/admin/jobs/pause
 */
app.post('/pause', async (c) => {
  await scrapeQueue.pause();

  return c.json({
    ok: true,
    data: { message: 'Queue paused' },
  });
});

/**
 * POST /resume
 *
 * Resume the scrape queue.
 *
 * @example
 * POST /api/admin/jobs/resume
 */
app.post('/resume', async (c) => {
  await scrapeQueue.resume();

  return c.json({
    ok: true,
    data: { message: 'Queue resumed' },
  });
});

export default app;
