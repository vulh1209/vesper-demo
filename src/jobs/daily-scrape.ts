import 'dotenv/config';
import { scrapeQueue } from './queue.js';

// Default schedule: 6 AM daily
const DEFAULT_CRON = '0 6 * * *';

/**
 * Schedule the daily scrape job
 *
 * Uses BullMQ Job Schedulers API (v5.16+)
 * - Replaces old "repeatable" jobs
 * - Survives worker restarts
 * - Only one job per scheduled time
 */
export async function scheduleDailyScrape(
  cronPattern: string = DEFAULT_CRON
): Promise<void> {
  console.log(`[scheduler] Setting up daily scrape: ${cronPattern}`);

  // Use upsertJobScheduler for idempotent scheduling
  await scrapeQueue.upsertJobScheduler(
    'daily-scrape',  // Scheduler ID
    {
      pattern: cronPattern,
      // Timezone support (optional)
      // tz: 'Asia/Ho_Chi_Minh',
    },
    {
      name: 'daily-scrape',
      data: {
        fullHistory: false,  // Incremental scrape
      },
      opts: {
        // Job-specific options can override queue defaults
      },
    }
  );

  console.log(`[scheduler] Daily scrape scheduled at: ${cronPattern}`);

  // Log next scheduled run
  const schedulers = await scrapeQueue.getJobSchedulers();
  for (const scheduler of schedulers) {
    if (scheduler.id === 'daily-scrape') {
      console.log(`[scheduler] Next run: ${scheduler.next ? new Date(scheduler.next).toISOString() : 'unknown'}`);
    }
  }
}

/**
 * Run a scrape job immediately (for testing)
 */
export async function runScrapeNow(
  channelIds?: string[],
  fullHistory: boolean = false
): Promise<string> {
  console.log('[scheduler] Queuing immediate scrape job...');

  const job = await scrapeQueue.add(
    'manual-scrape',
    {
      channelIds,
      fullHistory,
    },
    {
      priority: 1,  // Higher priority than scheduled jobs
    }
  );

  console.log(`[scheduler] Job queued: ${job.id}`);
  return job.id!;
}

/**
 * Remove the daily scheduler
 */
export async function unscheduleDailyScrape(): Promise<void> {
  await scrapeQueue.removeJobScheduler('daily-scrape');
  console.log('[scheduler] Daily scrape unscheduled');
}

/**
 * Get scheduler status
 */
export async function getSchedulerStatus(): Promise<{
  scheduled: boolean;
  pattern: string | null;
  nextRun: Date | null;
}> {
  const schedulers = await scrapeQueue.getJobSchedulers();
  const dailyScheduler = schedulers.find(s => s.id === 'daily-scrape');

  if (!dailyScheduler) {
    return { scheduled: false, pattern: null, nextRun: null };
  }

  return {
    scheduled: true,
    pattern: dailyScheduler.pattern || null,
    nextRun: dailyScheduler.next ? new Date(dailyScheduler.next) : null,
  };
}

// CLI: Run scheduler setup
if (require.main === module) {
  const action = process.argv[2];

  (async () => {
    switch (action) {
      case 'schedule':
        await scheduleDailyScrape(process.argv[3] || DEFAULT_CRON);
        break;
      case 'unschedule':
        await unscheduleDailyScrape();
        break;
      case 'status':
        const status = await getSchedulerStatus();
        console.log('Scheduler status:', status);
        break;
      case 'now':
        const jobId = await runScrapeNow();
        console.log(`Manual scrape queued: ${jobId}`);
        break;
      default:
        console.log('Usage: tsx src/jobs/daily-scrape.ts [schedule|unschedule|status|now]');
    }
    process.exit(0);
  })().catch(console.error);
}
