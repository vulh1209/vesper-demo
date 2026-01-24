# Phase 6: Support Chat DM with Bot - Research

**Researched:** 2026-01-24
**Domain:** Slack DM handling, Bolt.js events, conversation onboarding, Redis session state
**Confidence:** HIGH

## Summary

Phase 6 adds direct message (DM) support to the existing Slack bot, enabling users to query assets by messaging the bot directly rather than @mentioning in channels. The implementation leverages Slack's `message.im` event and reuses the existing query service, Block Kit views, and response patterns from Phase 3.

The key technical challenge is distinguishing DM events from channel messages and providing a first-time user onboarding experience. Slack Bolt handles this elegantly through channel_type filtering on the message event. The existing query service and Block Kit builders can be reused directly - the DM handler is essentially a thin wrapper that routes messages to the same logic as app_mention.

**Primary recommendation:** Add a `message` event listener filtered by `channel_type === 'im'`, reusing the existing query handler logic. Use `app_home_opened` event with conversations.history check for first-time user detection and onboarding message. Conversation history is optional - recommend simple Redis-based session state only if needed.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @slack/bolt | 4.6.0 | Slack app framework | Already in stack, handles message.im events natively |
| ioredis | 5.x | Session state storage | Already in stack for BullMQ, reuse for DM state |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @slack/types | 2.x | TypeScript definitions | Already installed, includes MessageEvent with channel_type |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| message event filtering | message.im event subscription only | Filtering gives more control, both work |
| Redis session state | PostgreSQL table | Redis faster for ephemeral state, PostgreSQL for audit trail |
| Simple onboarding | Full conversational flow | Keep it simple - just one welcome message |

**Installation:**
```bash
# No new dependencies required
# Already have: @slack/bolt, ioredis, @slack/types
```

## Architecture Patterns

### Recommended Project Structure

```
src/bot/
├── app.ts                    # Existing Bolt app initialization
├── commands/
│   └── vesper.ts             # Existing slash command
├── events/
│   ├── app-mention.ts        # Existing channel mentions
│   ├── dm-message.ts         # NEW: DM message handler
│   └── app-home-opened.ts    # NEW: First-time user onboarding
├── views/
│   ├── asset-result.ts       # Existing - reuse for DMs
│   ├── search-results.ts     # Existing - reuse for DMs
│   ├── error.ts              # Existing - reuse for DMs
│   ├── welcome.ts            # NEW: Welcome/onboarding blocks
│   └── index.ts              # Export all views
└── index.ts                  # Bot entry point
```

### Pattern 1: DM Message Handler with Channel Type Filter

**What:** Listen for `message` events and filter by `channel_type === 'im'` to handle only direct messages.

**When to use:** Always for DM handling in Bolt.js.

**Example:**
```typescript
// src/bot/events/dm-message.ts
// Source: Slack Bolt.js reference + @slack/types

import { app } from '../app.js';
import { findAssetByName, getAssetDetail, searchAssets } from '../../services/query/index.js';
import { buildAssetResultBlocks, buildSearchResultsBlocks, buildWelcomeBlocks } from '../views/index.js';
import type { GenericMessageEvent } from '@slack/types';

app.message(async ({ message, say }) => {
  // Type guard: only handle DMs, ignore channel messages
  const msg = message as GenericMessageEvent;

  if (msg.channel_type !== 'im') {
    return; // Not a DM, let other handlers process
  }

  // Ignore bot messages to prevent loops
  if (msg.bot_id || msg.subtype) {
    return;
  }

  const text = msg.text?.trim();

  if (!text) {
    await say(buildWelcomeBlocks());
    return;
  }

  try {
    // Same logic as app_mention handler
    const basicAsset = await findAssetByName(text);

    if (basicAsset) {
      const asset = await getAssetDetail(basicAsset.id);
      if (asset) {
        await say({ blocks: buildAssetResultBlocks(asset) });
        return;
      }
    }

    const { results } = await searchAssets({ query: text, limit: 5 });

    if (results.length === 0) {
      await say({
        text: `I couldn't find any assets matching "${text}". Try a different name.`,
      });
      return;
    }

    await say({ blocks: buildSearchResultsBlocks(results, text) });
  } catch (error) {
    console.error('DM error:', error);
    await say({
      text: 'Sorry, something went wrong. Please try again.',
    });
  }
});
```

### Pattern 2: First-Time User Detection via app_home_opened

**What:** Use `app_home_opened` event to detect when a user first opens a DM with the bot, then send a welcome message.

**When to use:** For onboarding new users without spamming returning users.

**Example:**
```typescript
// src/bot/events/app-home-opened.ts
// Source: Slack API events reference

import { app } from '../app.js';
import { buildWelcomeBlocks } from '../views/index.js';

// Track users who have been welcomed (in-memory for simplicity)
// For production: use Redis with TTL
const welcomedUsers = new Set<string>();

app.event('app_home_opened', async ({ event, client, say }) => {
  const userId = event.user;

  // Only welcome once per session/restart
  if (welcomedUsers.has(userId)) {
    return;
  }

  // Check if this is truly first interaction using conversations.history
  try {
    const result = await client.conversations.history({
      channel: event.channel,
      limit: 1,
    });

    // If there are previous messages, user has interacted before
    if (result.messages && result.messages.length > 0) {
      welcomedUsers.add(userId);
      return;
    }

    // First time - send welcome message
    welcomedUsers.add(userId);
    await say({
      channel: event.channel,
      blocks: buildWelcomeBlocks(),
    });
  } catch (error) {
    console.error('app_home_opened error:', error);
  }
});
```

### Pattern 3: Welcome Message Block Kit View

**What:** A friendly onboarding message explaining bot capabilities.

**When to use:** First-time DM interaction.

**Example:**
```typescript
// src/bot/views/welcome.ts
import type { KnownBlock } from '@slack/types';

export function buildWelcomeBlocks(): KnownBlock[] {
  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: 'Welcome to Vesper!',
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: 'I help you track asset versions. Just tell me what you\'re looking for!',
      },
    },
    {
      type: 'divider',
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Try these examples:*\n' +
          '\u2022 `ho ly` - Find the latest version of Ho Ly\n' +
          '\u2022 `boss theme` - Search for Boss Theme assets\n' +
          '\u2022 Just type any asset name!',
      },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: 'Tip: You can also @mention me in channels or use `/vesper` command.',
        },
      ],
    },
  ];
}
```

### Anti-Patterns to Avoid

- **Subscribing to user_events instead of bot_events:** This causes all bots in workspace to receive all DMs. Only use bot_events subscription for message.im.
- **Not filtering by channel_type:** Without the filter, handler runs for all messages including channel messages.
- **Not ignoring bot messages:** Can cause infinite loops if bot responds to its own messages.
- **Checking bot_id after processing:** Always check early to avoid unnecessary work.
- **Using conversations.history without limit:** Can timeout on channels with long history. Always limit: 1 for existence check.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DM detection | String prefix check on channel ID | `channel_type === 'im'` | Official, reliable, handles edge cases |
| First-time user tracking | Database table | Redis with TTL or in-memory Set | Ephemeral state, no audit trail needed |
| Response formatting | Custom DM format | Existing Block Kit builders | Consistency with channel responses |
| Query logic | Duplicate from app_mention | Import from services/query | Single source of truth |
| Bot loop prevention | Complex logic | Check `bot_id` and `subtype` | Standard Bolt pattern |

**Key insight:** DM handling is 95% reuse of existing code. The only new code is the event filter, onboarding message, and welcome view.

## Common Pitfalls

### Pitfall 1: Receiving All Workspace DMs

**What goes wrong:** Bot receives DM events for messages sent to other bots or users.

**Why it happens:** `message.im` subscribed under `user_events` instead of `bot_events` in app manifest.

**How to avoid:**
1. In Slack app settings, add `message.im` ONLY under "Subscribe to bot events"
2. Remove any `message.im` from "Subscribe to user events" section
3. Verify in app manifest that event is in `bot_events` array

**Warning signs:** Bot receiving messages it shouldn't, multiple bots responding to same DM

### Pitfall 2: Bot Responding to Itself

**What goes wrong:** Infinite loop of bot messages, eventual rate limiting.

**Why it happens:** Bot responds to its own messages without checking `bot_id`.

**How to avoid:**
```typescript
// Always check FIRST in handler
if (message.bot_id || message.subtype) {
  return;
}
```

**Warning signs:** Bot posting rapidly, "rate_limited" errors, Slack warning emails

### Pitfall 3: Welcome Message Spam

**What goes wrong:** User receives welcome message every time they open the DM.

**Why it happens:** `app_home_opened` fires on every DM open, not just first time.

**How to avoid:**
1. Track welcomed users in Set or Redis
2. Use conversations.history to check for prior messages
3. Set reasonable TTL if using Redis (e.g., 24 hours)

**Warning signs:** Users complaining about repeated welcome messages

### Pitfall 4: Missing OAuth Scopes

**What goes wrong:** Bot can't receive DM events or send messages to DMs.

**Why it happens:** App lacks required scopes for DM operations.

**How to avoid:** Add these scopes to bot token:
- `im:history` - Read DM history (for first-time detection)
- `im:read` - View basic DM info
- `im:write` - Start DM conversations (if initiating)
- `chat:write` - Send messages (already have this)

**Warning signs:** "missing_scope" errors, events not firing

### Pitfall 5: TypeScript Type Errors with Message Event

**What goes wrong:** TypeScript complains about `message.channel_type` or `message.text` not existing.

**Why it happens:** Message event type is a union of many subtypes, not all have these properties.

**How to avoid:**
```typescript
import type { GenericMessageEvent } from '@slack/types';

app.message(async ({ message, say }) => {
  const msg = message as GenericMessageEvent;
  if (msg.channel_type !== 'im') return;
  // Now TypeScript knows msg.text exists
});
```

**Warning signs:** TypeScript errors, runtime undefined errors

## Code Examples

Verified patterns from official sources and existing codebase:

### Complete DM Handler with All Guards

```typescript
// src/bot/events/dm-message.ts
// Source: Slack Bolt.js docs, @slack/types

import { app } from '../app.js';
import { findAssetByName, getAssetDetail, searchAssets } from '../../services/query/index.js';
import { buildAssetResultBlocks, buildSearchResultsBlocks, buildWelcomeBlocks } from '../views/index.js';
import type { GenericMessageEvent } from '@slack/types';

app.message(async ({ message, say, logger }) => {
  // Type assertion for proper typing
  const msg = message as GenericMessageEvent;

  // Guard 1: Only handle DMs
  if (msg.channel_type !== 'im') {
    return;
  }

  // Guard 2: Ignore bot messages (prevent loops)
  if (msg.bot_id) {
    return;
  }

  // Guard 3: Ignore message subtypes (edits, deletes, etc.)
  if (msg.subtype !== undefined) {
    return;
  }

  const text = msg.text?.trim();
  const userId = msg.user;

  logger.debug(`DM from ${userId}: ${text}`);

  // Empty message - show help
  if (!text) {
    await say({ blocks: buildWelcomeBlocks() });
    return;
  }

  try {
    // Reuse exact same logic as app_mention
    const basicAsset = await findAssetByName(text);

    if (basicAsset) {
      const asset = await getAssetDetail(basicAsset.id);
      if (asset) {
        await say({ blocks: buildAssetResultBlocks(asset) });
        return;
      }
    }

    // Fuzzy search fallback
    const { results } = await searchAssets({ query: text, limit: 5 });

    if (results.length === 0) {
      await say({
        text: `I couldn't find any assets matching "${text}". Try a different name or check the web dashboard.`,
      });
      return;
    }

    await say({ blocks: buildSearchResultsBlocks(results, text) });
  } catch (error) {
    logger.error('DM handler error:', error);
    await say({
      text: 'Sorry, something went wrong. Please try again.',
    });
  }
});
```

### Redis-Based First-Time User Tracking (Optional)

```typescript
// src/bot/events/app-home-opened.ts
// Only needed if in-memory Set resets too often

import { app } from '../app.js';
import { buildWelcomeBlocks } from '../views/index.js';
import IORedis from 'ioredis';

const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');
const WELCOME_TTL = 60 * 60 * 24; // 24 hours

app.event('app_home_opened', async ({ event, client, say, logger }) => {
  const userId = event.user;
  const redisKey = `vesper:welcomed:${userId}`;

  // Check if already welcomed recently
  const wasWelcomed = await redis.get(redisKey);
  if (wasWelcomed) {
    return;
  }

  try {
    // Verify no prior messages (truly first interaction)
    const result = await client.conversations.history({
      channel: event.channel,
      limit: 1,
    });

    if (result.messages && result.messages.length > 0) {
      // Has history, just mark as welcomed
      await redis.setex(redisKey, WELCOME_TTL, '1');
      return;
    }

    // First time ever - send welcome
    await redis.setex(redisKey, WELCOME_TTL, '1');
    await say({
      channel: event.channel,
      blocks: buildWelcomeBlocks(),
    });

    logger.info(`Welcomed new user: ${userId}`);
  } catch (error) {
    logger.error('app_home_opened error:', error);
  }
});
```

### Slack App Manifest Event Subscriptions

```yaml
# Required additions to slack app manifest
features:
  bot_user:
    display_name: Vesper
    always_online: true

oauth_config:
  scopes:
    bot:
      - chat:write        # Already have
      - commands          # Already have
      - app_mentions:read # Already have
      - im:history        # NEW: For first-time detection
      - im:read           # NEW: View DM info
      - im:write          # NEW: Start DM conversations

settings:
  event_subscriptions:
    bot_events:
      - app_mention       # Already have
      - message.im        # NEW: DM messages
      - app_home_opened   # NEW: DM opens
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| RTM API for DMs | Events API + message.im | 2020+ | RTM deprecated |
| im.open API | conversations.open | 2018+ | Conversations API is unified |
| Custom message parsing | channel_type field | Always available | Cleaner, official method |
| user_events subscription | bot_events only | Best practice | Prevents cross-bot event leakage |

**Deprecated/outdated:**
- `im.open` - Use `conversations.open` instead
- `im.history` - Use `conversations.history` instead
- RTM API for message events - Use Events API

## Open Questions

Things that couldn't be fully resolved:

1. **Conversation context/history across messages**
   - What we know: Phase goal says "optional: conversation history"
   - What's unclear: Whether multi-turn conversation is actually needed
   - Recommendation: Skip for MVP - each DM is independent query. Add later if users request.

2. **Rate limits on conversations.history for first-time detection**
   - What we know: As of May 2025, new apps limited to 1 req/min for this API
   - What's unclear: Whether vesper app is "new" or grandfathered
   - Recommendation: Use in-memory Set as primary, Redis as backup. Only call API on first app_home_opened per session.

3. **im:write scope necessity**
   - What we know: Needed to initiate DMs with users
   - What's unclear: Whether bot ever needs to initiate vs just respond
   - Recommendation: Add scope anyway - low cost, enables future features

## Sources

### Primary (HIGH confidence)
- [@slack/types message.d.ts](https://github.com/slackapi/node-slack-sdk/blob/main/packages/types/src/events/message.ts) - GenericMessageEvent with channel_type
- [Slack Bolt.js Reference](https://docs.slack.dev/tools/bolt-js/reference) - app.message() API
- [message.im Event](https://docs.slack.dev/reference/events/message.im) - DM event structure
- [app_home_opened Event](https://docs.slack.dev/reference/events/app_home_opened) - Onboarding trigger

### Secondary (MEDIUM confidence)
- [GitHub Issue #2323](https://github.com/slackapi/bolt-js/issues/2323) - DM-only response pattern, user_events vs bot_events
- [GitHub Issue #601](https://github.com/slackapi/bolt-js/issues/601) - Message event listener patterns
- [conversations.history](https://docs.slack.dev/reference/methods/conversations.history) - First-time detection

### Tertiary (LOW confidence)
- [Slack Bot Memory with Redis](https://redis.io/blog/chatgpt-memory-project/) - Session state patterns (more complex than needed)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Uses existing dependencies, official Slack patterns
- Architecture: HIGH - Follows established Phase 3 patterns exactly
- Pitfalls: HIGH - Based on official docs and GitHub issues with Slack team responses

**Research date:** 2026-01-24
**Valid until:** 2026-02-24 (30 days - Slack APIs stable, Bolt.js 4.x LTS)
