# Phase 1: Foundation & Data Pipeline - Research

**Researched:** 2026-01-23
**Domain:** Slack data ingestion, asset version extraction, version history tracking
**Confidence:** HIGH

## Summary

Phase 1 establishes the data foundation: scraping Slack channels, extracting asset versions from messages, and storing version history with source attribution. The critical challenge is Slack's rate limit changes (1 req/min for non-Marketplace apps as of May 2025) and building robust version parsing that handles Vietnamese naming conventions with variations.

The recommended approach uses incremental fetching with timestamp anchoring (not full history on each run), hybrid regex + normalization for version extraction, and PostgreSQL with Drizzle ORM for structured storage. BullMQ handles daily scheduling with persistence and retry logic.

**Primary recommendation:** Design for worst-case Slack rate limits from day one. Use incremental sync with `oldest` parameter, cache aggressively, and verify app is classified as "internal/custom" to avoid commercial distribution rate limits.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @slack/bolt | 4.6.0 | Slack app framework | Official SDK, handles rate limits, pagination, OAuth |
| drizzle-orm | 0.45.1 | Type-safe database access | Lightweight, no codegen, SQL-like API |
| postgres | 3.x | PostgreSQL driver | Native driver for Drizzle |
| bullmq | 5.66.7 | Job scheduling | Persistence, retries, cron patterns |
| ioredis | 5.x | Redis client | BullMQ backend |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | 3.x | Schema validation | Validate extracted asset data |
| date-fns | 3.x | Date manipulation | Format timestamps, date ranges |
| fuse.js | 7.x | Fuzzy matching | Match asset names with typos |
| @vn-utils/text | 0.0.1 | Vietnamese text normalization | Remove diacritics for matching |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| BullMQ | node-cron | node-cron is simpler but no persistence; jobs lost on restart |
| Drizzle | Prisma | Prisma is more mature but heavier, requires codegen |
| PostgreSQL | SQLite | SQLite simpler but poor write concurrency for scheduled jobs |
| Fuse.js | custom regex | Fuse.js more robust for fuzzy matching edge cases |

**Installation:**
```bash
npm install @slack/bolt drizzle-orm postgres bullmq ioredis zod date-fns fuse.js
npm install -D drizzle-kit @types/node
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── db/
│   ├── schema.ts           # Drizzle schema definitions
│   ├── client.ts           # Database connection
│   └── migrations/         # Generated migrations
├── services/
│   ├── slack/
│   │   ├── client.ts       # Slack API wrapper
│   │   ├── scraper.ts      # Channel scraping logic
│   │   └── types.ts        # Slack message types
│   ├── asset/
│   │   ├── parser.ts       # Version extraction from messages
│   │   ├── normalizer.ts   # Vietnamese text normalization
│   │   └── matcher.ts      # Asset name fuzzy matching
│   └── version/
│       ├── tracker.ts      # Version history management
│       └── types.ts        # Version types
├── jobs/
│   ├── queue.ts            # BullMQ queue setup
│   ├── worker.ts           # Job worker
│   └── daily-scrape.ts     # Daily scrape job logic
├── config/
│   └── channels.ts         # Configured channel list
└── index.ts                # Entry point
```

### Pattern 1: Incremental Sync with Timestamp Anchoring

**What:** Store last successful sync timestamp per channel. On next run, only fetch messages newer than that timestamp using `oldest` parameter.

**When to use:** Always for Slack scraping. Full history fetches hit rate limits.

**Example:**
```typescript
// Source: Slack conversations.history API
// https://docs.slack.dev/reference/methods/conversations.history/

interface SyncState {
  channelId: string;
  lastSyncTs: string;  // Slack timestamp format: "1234567890.123456"
  lastSyncAt: Date;
}

async function incrementalFetch(channelId: string, lastTs: string | null) {
  const params: any = {
    channel: channelId,
    limit: 200,  // Recommended max per request
  };

  if (lastTs) {
    params.oldest = lastTs;
    params.inclusive = false;  // Don't include the last message again
  }

  const messages: Message[] = [];
  let cursor: string | undefined;

  do {
    const response = await slack.conversations.history({
      ...params,
      cursor,
    });

    messages.push(...(response.messages ?? []));
    cursor = response.response_metadata?.next_cursor;

    // Respect rate limits: wait between requests
    await sleep(1000);  // 1 req/sec is safe buffer

  } while (cursor);  // ONLY check cursor, never result count

  return messages;
}
```

### Pattern 2: Hybrid Version Extraction (Regex + Normalization)

**What:** Use regex patterns to extract version strings, with Vietnamese normalization as preprocessing step.

**When to use:** For parsing asset versions from Slack messages with naming variation tolerance.

**Example:**
```typescript
// Vietnamese text normalization for matching
function normalizeVietnamese(text: string): string {
  // Common Vietnamese diacritic mappings
  const diacriticMap: Record<string, string> = {
    'à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ': 'a',
    'è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ': 'e',
    'ì|í|ị|ỉ|ĩ': 'i',
    'ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ': 'o',
    'ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ': 'u',
    'ỳ|ý|ỵ|ỷ|ỹ': 'y',
    'đ': 'd',
  };

  let normalized = text.toLowerCase();
  for (const [pattern, replacement] of Object.entries(diacriticMap)) {
    normalized = normalized.replace(new RegExp(pattern, 'gi'), replacement);
  }
  return normalized;
}

// Version patterns to match
const VERSION_PATTERNS = [
  // "ho ly v3", "ho_ly_v3", "hồ ly v3"
  /(?<asset>[\w\s]+?)\s*[_\-\s]*v(?<version>\d+(?:\.\d+)?)/i,
  // "Ho Ly Version 3"
  /(?<asset>[\w\s]+?)\s+version\s+(?<version>\d+(?:\.\d+)?)/i,
  // "character_rig_v14_final"
  /(?<asset>[\w_]+)_v(?<version>\d+(?:\.\d+)?)/i,
];

interface ExtractedVersion {
  rawAssetName: string;
  normalizedAssetName: string;
  version: string;
  confidence: 'high' | 'medium' | 'low';
}

function extractVersion(text: string): ExtractedVersion | null {
  const normalizedText = normalizeVietnamese(text);

  for (const pattern of VERSION_PATTERNS) {
    const match = normalizedText.match(pattern);
    if (match?.groups) {
      return {
        rawAssetName: match.groups.asset.trim(),
        normalizedAssetName: normalizeVietnamese(match.groups.asset.trim()),
        version: match.groups.version,
        confidence: 'high',
      };
    }
  }

  return null;
}
```

### Pattern 3: Message-to-Permalink Storage

**What:** Store Slack message `ts` and channel ID to generate permalinks for source attribution.

**When to use:** Every version entry must link back to source Slack message.

**Example:**
```typescript
// Generate permalink from stored ts and channel
// Source: https://api.slack.com/methods/chat.getPermalink

async function getMessagePermalink(
  channelId: string,
  messageTs: string
): Promise<string> {
  const result = await slack.chat.getPermalink({
    channel: channelId,
    message_ts: messageTs,
  });
  return result.permalink!;
}

// Or construct manually (works for public channels)
function constructPermalink(
  workspaceUrl: string,
  channelId: string,
  messageTs: string
): string {
  // ts format: "1234567890.123456" -> "p1234567890123456"
  const tsWithoutDot = messageTs.replace('.', '');
  return `${workspaceUrl}/archives/${channelId}/p${tsWithoutDot}`;
}
```

### Anti-Patterns to Avoid

- **Full history on every run:** Rate limit strangulation. Always use incremental sync.
- **Checking result count for pagination end:** ONLY check `next_cursor`. Empty cursor = done.
- **Storing ts as number:** Store as string. Float precision loss corrupts unique IDs.
- **Processing messages one at a time:** Batch processing is more efficient and rate-limit friendly.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Job scheduling | setTimeout/setInterval | BullMQ | No persistence, lost on restart, no retries |
| Rate limit handling | Custom backoff logic | @slack/bolt | Built into SDK, handles 429 automatically |
| Fuzzy text matching | Custom string distance | Fuse.js | Edge cases, performance, well-tested |
| Vietnamese normalization | Character-by-character | @vn-utils/text or proven gist | Diacritic combinations are complex |
| Pagination logic | Manual cursor tracking | SDK iterators | Cursor expiration, edge cases |
| Timestamp formatting | Custom parsing | date-fns | Timezone handling, edge cases |

**Key insight:** Slack API behavior has many edge cases (cursors expire, rate limits vary by app classification, ts precision). Use official SDK and battle-tested libraries.

## Common Pitfalls

### Pitfall 1: Rate Limit Strangulation (Non-Marketplace Apps)

**What goes wrong:** Since May 29, 2025, non-Marketplace apps face 1 req/min limit with max 15 objects per request on `conversations.history`. Daily jobs that worked in dev break catastrophically.

**Why it happens:** Slack changed policy to push apps toward Marketplace. Many teams build apps Slack classifies as "commercially distributed" when they intended "internal."

**How to avoid:**
1. Verify app is registered as "Custom App" (internal), not commercially distributed
2. Design for worst-case: 1 req/min, 15 objects
3. Implement exponential backoff on 429 errors
4. Use incremental fetching with `oldest` parameter
5. Consider Marketplace approval (free, removes limits)

**Warning signs:** HTTP 429 errors, jobs taking 10x longer, inconsistent data

### Pitfall 2: Pagination Data Loss (Silent Failures)

**What goes wrong:** Jobs "complete successfully" but miss 30% of messages because:
- Checked `len(results) < limit` to determine completion (wrong)
- Cursor expired mid-job
- New messages arrived during pagination

**Why it happens:** Slack pagination is cursor-based, not offset-based. It's possible to receive fewer results than limit while more exist.

**How to avoid:**
1. ONLY check `next_cursor` - empty/null/missing = done
2. Don't persist cursors across runs
3. Use timestamp anchoring with `oldest` parameter
4. Idempotent processing - dedupe by `ts`

**Warning signs:** Scraping results vary between runs, `invalid_cursor` errors, users report missing updates

### Pitfall 3: Threaded Replies Invisible

**What goes wrong:** Asset version posted as thread reply never appears in database. `conversations.history` only returns channel messages, not thread replies.

**Why it happens:** Thread replies require separate `conversations.replies` call with parent message `ts`.

**How to avoid:**
1. Detect `thread_ts` in messages (indicates it has replies)
2. Fetch replies separately with `conversations.replies`
3. Or skip threads in Phase 1, document limitation

**Warning signs:** Users say "I posted but it's not showing"

### Pitfall 4: Vietnamese Matching Inconsistency

**What goes wrong:** "Hồ Ly" posted yesterday doesn't match search for "ho ly" today. Or worse, "Ho Ly" and "Hồ Ly" create two separate assets.

**Why it happens:** Diacritics and case sensitivity not normalized consistently.

**How to avoid:**
1. Always store BOTH raw name and normalized name
2. Match on normalized name
3. Display raw name to users
4. Use same normalization function everywhere

**Warning signs:** Duplicate assets with slight name variations

## Code Examples

### Database Schema (Drizzle ORM)

```typescript
// src/db/schema.ts
// Source: https://orm.drizzle.team/docs/sql-schema-declaration

import { pgTable, text, timestamp, integer, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Reusable timestamp columns
const timestamps = {
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
};

// Tracked Slack channels
export const channels = pgTable('channels', {
  id: text('id').primaryKey(),  // Slack channel ID
  name: text('name').notNull(),
  lastSyncTs: text('last_sync_ts'),  // Last synced message ts
  lastSyncAt: timestamp('last_sync_at'),
  ...timestamps,
});

// Assets (unique by normalized name)
export const assets = pgTable('assets', {
  id: text('id').primaryKey(),  // UUID
  rawName: text('raw_name').notNull(),
  normalizedName: text('normalized_name').notNull(),
  category: text('category'),  // sound, 3d, 2d, animation, ui, story
  latestVersion: text('latest_version'),
  latestVersionId: text('latest_version_id'),
  ...timestamps,
}, (table) => [
  uniqueIndex('idx_assets_normalized_name').on(table.normalizedName),
]);

// Version history per asset
export const assetVersions = pgTable('asset_versions', {
  id: text('id').primaryKey(),  // UUID
  assetId: text('asset_id').notNull().references(() => assets.id),
  version: text('version').notNull(),
  author: text('author'),  // Slack user ID
  authorName: text('author_name'),  // Resolved display name
  slackChannelId: text('slack_channel_id').notNull(),
  slackMessageTs: text('slack_message_ts').notNull(),  // Store as string!
  slackPermalink: text('slack_permalink'),
  rawMessage: text('raw_message'),  // Original message text
  ...timestamps,
}, (table) => [
  index('idx_versions_asset_id').on(table.assetId),
  index('idx_versions_created_at').on(table.createdAt),
  uniqueIndex('idx_versions_unique').on(table.slackChannelId, table.slackMessageTs),
]);

// Raw Slack messages (for debugging/reprocessing)
export const slackMessages = pgTable('slack_messages', {
  id: text('id').primaryKey(),  // channelId + ts
  channelId: text('channel_id').notNull(),
  messageTs: text('message_ts').notNull(),  // Slack timestamp
  userId: text('user_id'),
  messageData: jsonb('message_data').notNull(),  // Full Slack payload
  processed: timestamp('processed_at'),
  ...timestamps,
}, (table) => [
  index('idx_messages_channel_ts').on(table.channelId, table.messageTs),
]);

// Relations
export const assetsRelations = relations(assets, ({ many }) => ({
  versions: many(assetVersions),
}));

export const assetVersionsRelations = relations(assetVersions, ({ one }) => ({
  asset: one(assets, {
    fields: [assetVersions.assetId],
    references: [assets.id],
  }),
}));
```

### Daily Scrape Job (BullMQ)

```typescript
// src/jobs/daily-scrape.ts
// Source: https://docs.bullmq.io/guide/job-schedulers

import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { scrapeChannel } from '../services/slack/scraper';
import { processMessages } from '../services/asset/parser';
import { getConfiguredChannels } from '../config/channels';

const connection = new IORedis(process.env.REDIS_URL!);

// Create queue
export const scrapeQueue = new Queue('daily-scrape', { connection });

// Schedule daily job at 6 AM
await scrapeQueue.upsertJobScheduler(
  'daily-scrape-scheduler',
  { pattern: '0 6 * * *' },  // 6:00 AM daily
  {
    name: 'scrape-all-channels',
    opts: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 60000,  // Start with 1 min delay
      },
    },
  }
);

// Worker to process jobs
export const scrapeWorker = new Worker(
  'daily-scrape',
  async (job) => {
    const channels = await getConfiguredChannels();
    const results = [];

    for (const channel of channels) {
      try {
        // 1. Fetch new messages since last sync
        const messages = await scrapeChannel(channel.id);

        // 2. Extract asset versions
        const versions = await processMessages(messages, channel.id);

        results.push({
          channelId: channel.id,
          messagesProcessed: messages.length,
          versionsExtracted: versions.length,
        });
      } catch (error) {
        console.error(`Failed to process channel ${channel.id}:`, error);
        // Continue with other channels
      }
    }

    return { success: true, results };
  },
  {
    connection,
    concurrency: 1,  // Process one job at a time
  }
);
```

### Slack Scraper with Rate Limit Handling

```typescript
// src/services/slack/scraper.ts
import { App } from '@slack/bolt';
import { db } from '../../db/client';
import { channels } from '../../db/schema';
import { eq } from 'drizzle-orm';

const slack = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

interface SlackMessage {
  ts: string;
  text?: string;
  user?: string;
  thread_ts?: string;
}

export async function scrapeChannel(channelId: string): Promise<SlackMessage[]> {
  // Get last sync timestamp
  const [channel] = await db
    .select()
    .from(channels)
    .where(eq(channels.id, channelId));

  const lastSyncTs = channel?.lastSyncTs;
  const messages: SlackMessage[] = [];
  let cursor: string | undefined;
  let newestTs: string | null = null;

  try {
    do {
      const response = await slack.client.conversations.history({
        channel: channelId,
        limit: 200,
        cursor,
        ...(lastSyncTs && { oldest: lastSyncTs, inclusive: false }),
      });

      const pageMessages = response.messages ?? [];
      messages.push(...pageMessages);

      // Track newest message for next sync
      if (pageMessages.length > 0 && !newestTs) {
        newestTs = pageMessages[0].ts!;  // First message is newest
      }

      cursor = response.response_metadata?.next_cursor || undefined;

      // Respect rate limits - wait between requests
      if (cursor) {
        await sleep(1000);  // 1 second between requests
      }
    } while (cursor);

    // Update sync state
    if (newestTs) {
      await db
        .update(channels)
        .set({
          lastSyncTs: newestTs,
          lastSyncAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(channels.id, channelId));
    }

    return messages;
  } catch (error: any) {
    if (error.code === 'slack_webapi_rate_limited') {
      const retryAfter = error.retryAfter || 60;
      console.log(`Rate limited. Retry after ${retryAfter}s`);
      throw error;  // Let BullMQ handle retry
    }
    throw error;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Unlimited Slack API calls | 1 req/min for non-Marketplace apps | May 2025 | Must design for rate limits from day 1 |
| Legacy bot tokens | Bolt SDK with app tokens | March 2025 | Legacy bots stopped working |
| Socket Mode for production | HTTP Events API | 2024 | Socket Mode for dev only |
| Repeatable jobs in BullMQ | Job Schedulers API | v5.16.0 | `upsertJobScheduler` replaces repeatable |
| serial columns in Postgres | identity columns | Postgres 10+ | Drizzle recommends identity |

**Deprecated/outdated:**
- Legacy Slack bot tokens: Stopped working March 2025
- Socket Mode for production: Use HTTP Events API for reliability
- `conversations.history` without pagination: Will hit stricter limits

## Open Questions

Things that couldn't be fully resolved:

1. **Thread reply handling in Phase 1**
   - What we know: Thread replies require separate API calls (`conversations.replies`)
   - What's unclear: How much thread activity contains asset updates?
   - Recommendation: Skip threads in Phase 1, document as known limitation, add in Phase 1.1 if users report missing data

2. **Asset category detection**
   - What we know: 6 categories (Sound, 3D, 2D, Animation, UI, Story)
   - What's unclear: How reliably can category be inferred from Slack message?
   - Recommendation: Start with channel-based category (each channel = one category), add AI classification in Phase 2

3. **Private channel support**
   - What we know: Private channels require bot invitation + `groups:history` scope
   - What's unclear: Does IT approval include private channel scopes?
   - Recommendation: Start with public channels only, add private in Phase 1.1 if needed

## Sources

### Primary (HIGH confidence)
- [Slack conversations.history API](https://docs.slack.dev/reference/methods/conversations.history/) - Rate limits, pagination, parameters
- [Slack Rate Limits Documentation](https://docs.slack.dev/apis/web-api/rate-limits/) - Tier system, 429 handling
- [Slack Rate Limit Changes May 2025](https://docs.slack.dev/changelog/2025/05/29/rate-limit-changes-for-non-marketplace-apps/) - Non-marketplace restrictions
- [BullMQ Job Schedulers](https://docs.bullmq.io/guide/job-schedulers) - Daily cron patterns, upsertJobScheduler
- [Drizzle ORM Schema](https://orm.drizzle.team/docs/sql-schema-declaration) - PostgreSQL schema patterns
- [chat.getPermalink API](https://api.slack.com/methods/chat.getPermalink) - Generating message links

### Secondary (MEDIUM confidence)
- [Slack Pagination Best Practices](https://docs.slack.dev/apis/web-api/pagination/) - Cursor handling
- [Drizzle ORM Best Practices 2025](https://gist.github.com/productdevbook/7c9ce3bbeb96b3fabc3c7c2aa2abc717) - Timestamp patterns
- [BullMQ Scheduled Tasks Guide](https://betterstack.com/community/guides/scaling-nodejs/bullmq-scheduled-tasks/) - Production patterns
- [Vietnamese regex-vietnamese library](https://github.com/lehuygiang28/regex-vietnamese) - Text normalization (archived, use @vn-utils/text)
- [Fuse.js Documentation](https://www.fusejs.io/) - Fuzzy matching API

### Tertiary (LOW confidence)
- [PGroonga for Vietnamese FTS](https://pgroonga.github.io/) - PostgreSQL full-text search extension - not needed for Phase 1, consider for Phase 2

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Verified via official docs, npm registry, project research
- Architecture: HIGH - Patterns from Slack docs and BullMQ docs
- Pitfalls: HIGH - Documented in official Slack changelog and project research

**Research date:** 2026-01-23
**Valid until:** 2026-02-23 (30 days - Slack API is stable, rate limit policy already in effect)
