import { slackClient, constructPermalink } from './client.js';
import { SlackMessage, ScrapeResult, ChannelSyncState } from './types.js';

// Rate limit safety: wait between paginated requests
const RATE_LIMIT_DELAY_MS = 1000;  // 1 second between requests
const PAGE_SIZE = 200;  // Recommended max per Slack docs

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Scrape a channel for new messages since lastSyncTs
 *
 * CRITICAL: Follows Slack pagination correctly:
 * - Uses `oldest` parameter for incremental fetch
 * - ONLY checks `next_cursor` for pagination end (never result count)
 * - Stores ts as string (float precision issues with numbers)
 *
 * @param channelId - Slack channel ID (e.g., C1234567890)
 * @param lastSyncTs - Last synced message ts, or null for full history
 * @returns ScrapeResult with messages and sync metadata
 */
export async function scrapeChannel(
  channelId: string,
  lastSyncTs: string | null = null
): Promise<ScrapeResult> {
  const messages: SlackMessage[] = [];
  let cursor: string | undefined;
  let newestTs: string | null = null;
  let oldestTs: string | null = null;
  let requestCount = 0;

  console.log(`[scraper] Starting scrape for channel ${channelId}`);
  if (lastSyncTs) {
    console.log(`[scraper] Incremental fetch from ts: ${lastSyncTs}`);
  } else {
    console.log(`[scraper] Full history fetch (no lastSyncTs)`);
  }

  try {
    do {
      requestCount++;
      console.log(`[scraper] Request ${requestCount}, cursor: ${cursor ? 'present' : 'none'}`);

      const response = await slackClient.conversations.history({
        channel: channelId,
        limit: PAGE_SIZE,
        cursor,
        // Incremental fetch: only messages newer than lastSyncTs
        ...(lastSyncTs && { oldest: lastSyncTs, inclusive: false }),
      });

      const pageMessages = (response.messages ?? []) as SlackMessage[];

      // Filter out subtypes we don't care about (channel_join, etc.)
      const relevantMessages = pageMessages.filter(msg => {
        // Skip messages without text
        if (!msg.text) return false;
        // Skip bot messages and system messages
        if (msg.subtype && msg.subtype !== 'me_message') return false;
        return true;
      });

      messages.push(...relevantMessages);

      // Track newest (first message in first page is newest)
      if (requestCount === 1 && relevantMessages.length > 0) {
        newestTs = relevantMessages[0].ts;
      }

      // Track oldest (last message in last page)
      if (relevantMessages.length > 0) {
        oldestTs = relevantMessages[relevantMessages.length - 1].ts;
      }

      // CRITICAL: ONLY check cursor for pagination
      // Do NOT check message count - Slack can return < limit with more pages
      cursor = response.response_metadata?.next_cursor || undefined;

      // Rate limit protection
      if (cursor) {
        console.log(`[scraper] More pages available, waiting ${RATE_LIMIT_DELAY_MS}ms`);
        await sleep(RATE_LIMIT_DELAY_MS);
      }

    } while (cursor);  // Continue ONLY while cursor exists

    console.log(`[scraper] Completed: ${messages.length} messages in ${requestCount} requests`);

    return {
      channelId,
      messages,
      newestTs,
      oldestTs,
      totalFetched: messages.length,
    };

  } catch (error: any) {
    // Handle rate limiting specifically
    if (error.code === 'slack_webapi_platform_error' &&
        error.data?.error === 'ratelimited') {
      const retryAfter = error.data?.retry_after || 60;
      console.error(`[scraper] Rate limited! Retry after ${retryAfter}s`);
      // Re-throw with retry info for job scheduler to handle
      throw Object.assign(error, { retryAfter });
    }

    // Handle channel not found
    if (error.data?.error === 'channel_not_found') {
      console.error(`[scraper] Channel ${channelId} not found or bot not in channel`);
      throw new Error(`Channel not found: ${channelId}. Ensure bot is invited to channel.`);
    }

    // Handle missing scopes
    if (error.data?.error === 'missing_scope') {
      console.error(`[scraper] Missing required scope: ${error.data?.needed}`);
      throw new Error(`Missing Slack scope: ${error.data?.needed}`);
    }

    throw error;
  }
}

/**
 * Test Slack connection by listing channels
 */
export async function testConnection(): Promise<{ ok: boolean; channels: number }> {
  try {
    const result = await slackClient.conversations.list({
      types: 'public_channel',
      limit: 10,
    });

    const channelCount = result.channels?.length ?? 0;
    console.log(`[scraper] Connection test successful. Found ${channelCount} channels.`);

    return { ok: true, channels: channelCount };
  } catch (error: any) {
    console.error('[scraper] Connection test failed:', error.message);
    return { ok: false, channels: 0 };
  }
}
