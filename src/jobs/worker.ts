import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { connection } from './queue.js';
import { scrapeChannel } from '../services/slack/scraper.js';
import { extractAllVersions } from '../services/asset/parser.js';
import { createOrUpdateVersion } from '../services/version/tracker.js';
import { getConfiguredChannels, updateChannelSyncState, getChannelSyncState } from '../config/channels.js';
import { db } from '../db/client.js';
import { slackMessages } from '../db/schema.js';
import type { SlackMessage } from '../services/slack/types.js';

interface ScrapeJobData {
  channelIds?: string[];  // Optional: specific channels to scrape
  fullHistory?: boolean;  // Optional: ignore lastSyncTs
}

interface ScrapeJobResult {
  channelsProcessed: number;
  messagesProcessed: number;
  versionsExtracted: number;
  errors: string[];
}

/**
 * Process messages and extract versions
 */
async function processMessages(
  messages: SlackMessage[],
  channelId: string
): Promise<number> {
  let versionsExtracted = 0;

  for (const message of messages) {
    // Store raw message for debugging/reprocessing
    const messageId = `${channelId}:${message.ts}`;
    await db.insert(slackMessages).values({
      id: messageId,
      channelId,
      messageTs: message.ts,
      userId: message.user || null,
      text: message.text || null,
      messageData: message,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).onConflictDoNothing();

    // Extract versions from message
    if (message.text) {
      const versions = extractAllVersions(message.text);

      for (const extracted of versions) {
        const created = await createOrUpdateVersion(
          extracted,
          channelId,
          message.ts,
          message.user || null,
          null,  // authorName - would need separate API call
          message.text
        );

        if (created) {
          versionsExtracted++;
        }
      }
    }
  }

  return versionsExtracted;
}

/**
 * Scrape a single channel
 */
async function scrapeOneChannel(
  channelId: string,
  fullHistory: boolean
): Promise<{ messages: number; versions: number }> {
  // Get last sync state
  const syncState = await getChannelSyncState(channelId);
  const lastSyncTs = fullHistory ? null : syncState?.lastSyncTs || null;

  console.log(`[worker] Scraping channel ${channelId} (from ts: ${lastSyncTs || 'beginning'})`);

  // Scrape channel
  const result = await scrapeChannel(channelId, lastSyncTs);

  // Process messages
  const versionsExtracted = await processMessages(result.messages, channelId);

  // Update sync state
  if (result.newestTs) {
    await updateChannelSyncState(channelId, result.newestTs);
  }

  return {
    messages: result.totalFetched,
    versions: versionsExtracted,
  };
}

/**
 * Worker processor function
 */
async function processJob(job: Job<ScrapeJobData>): Promise<ScrapeJobResult> {
  console.log(`[worker] Processing job ${job.id}: ${job.name}`);

  const { channelIds, fullHistory = false } = job.data;
  const result: ScrapeJobResult = {
    channelsProcessed: 0,
    messagesProcessed: 0,
    versionsExtracted: 0,
    errors: [],
  };

  // Get channels to scrape
  const channels = channelIds?.length
    ? channelIds.map(id => ({ id, name: id }))
    : await getConfiguredChannels();

  if (channels.length === 0) {
    console.log('[worker] No channels configured to scrape');
    return result;
  }

  // Scrape each channel
  for (const channel of channels) {
    try {
      await job.updateProgress({
        channel: channel.name,
        processed: result.channelsProcessed,
        total: channels.length,
      });

      const channelResult = await scrapeOneChannel(channel.id, fullHistory);

      result.channelsProcessed++;
      result.messagesProcessed += channelResult.messages;
      result.versionsExtracted += channelResult.versions;

      console.log(`[worker] Channel ${channel.name}: ${channelResult.messages} messages, ${channelResult.versions} versions`);

    } catch (error: unknown) {
      const errorMsg = `Channel ${channel.id}: ${error instanceof Error ? error.message : String(error)}`;
      console.error(`[worker] Error: ${errorMsg}`);
      result.errors.push(errorMsg);
      // Continue with other channels
    }
  }

  console.log(`[worker] Job complete: ${result.channelsProcessed} channels, ${result.messagesProcessed} messages, ${result.versionsExtracted} versions`);

  return result;
}

// Create worker
export const scrapeWorker = new Worker('vesper-scrape', processJob, {
  connection,
  concurrency: 1,  // Process one job at a time (rate limit friendly)
});

// Worker event handlers
scrapeWorker.on('completed', (job, result) => {
  console.log(`[worker] Job ${job.id} completed:`, result);
});

scrapeWorker.on('failed', (job, error) => {
  console.error(`[worker] Job ${job?.id} failed:`, error.message);
});

scrapeWorker.on('error', (error) => {
  console.error('[worker] Worker error:', error);
});

/**
 * Start the worker (entry point)
 */
export async function startWorker(): Promise<void> {
  console.log('[worker] Starting Vesper worker...');
  console.log(`[worker] Connected to Redis: ${process.env.REDIS_URL || 'localhost:6379'}`);

  // Worker is already started by creating the Worker instance
  // This function just logs and keeps the process alive
}

// Run if executed directly (CommonJS compatible check)
if (require.main === module) {
  startWorker().catch(console.error);
}
