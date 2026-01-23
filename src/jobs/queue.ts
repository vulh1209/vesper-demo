import { Queue, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';

// Redis connection for BullMQ
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
export const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,  // Required for BullMQ
});

// Main scrape queue
export const scrapeQueue = new Queue('vesper-scrape', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 60000,  // Start with 1 minute, exponential backoff
    },
    removeOnComplete: {
      count: 100,  // Keep last 100 completed jobs
    },
    removeOnFail: {
      count: 50,   // Keep last 50 failed jobs
    },
  },
});

// Queue events for monitoring
export const scrapeQueueEvents = new QueueEvents('vesper-scrape', { connection });

// Log queue events
scrapeQueueEvents.on('completed', ({ jobId }) => {
  console.log(`[queue] Job ${jobId} completed`);
});

scrapeQueueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`[queue] Job ${jobId} failed: ${failedReason}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[queue] Shutting down...');
  await scrapeQueue.close();
  await scrapeQueueEvents.close();
  await connection.quit();
  process.exit(0);
});
