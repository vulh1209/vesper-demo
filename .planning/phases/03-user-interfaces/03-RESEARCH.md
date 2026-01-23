# Phase 3: User Interfaces - Research

**Researched:** 2026-01-23
**Domain:** Slack bot development, web dashboard, shared query layer, Vietnamese UX
**Confidence:** HIGH

## Summary

Phase 3 exposes the asset tracking system through two interfaces: a Slack bot for in-workflow queries and a web dashboard for browsing/history. The critical pattern is a shared query layer that ensures both interfaces return identical results from the Phase 2 intelligence layer.

The recommended approach uses Slack Bolt.js (already in the Phase 1 stack) for the bot, Hono for a lightweight API layer, and Next.js with shadcn/ui for the dashboard. Bolt.js handles Slack-specific concerns (slash commands, app mentions, Block Kit formatting), while Hono serves as a thin HTTP layer that both the bot and dashboard consume. This separation ensures consistency and avoids duplicating query logic.

**Primary recommendation:** Build a shared query service layer first, then build both interfaces as thin presentation layers on top. The Slack bot and web dashboard should never directly access the database - they call the query service.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @slack/bolt | 4.6.0 | Slack app framework | Official SDK, already in Phase 1 stack, handles events/commands |
| hono | 4.x | Lightweight API framework | Ultra-light (14KB), TypeScript-first, shares Drizzle patterns |
| next | 15.x | Dashboard framework | React 19 support, App Router, shadcn/ui ecosystem |
| @shadcn/ui | latest | UI components | Accessible, Tailwind-based, copy-paste ownership |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @slack/types | 2.x | Slack type definitions | TypeScript autocompletion for Block Kit |
| tailwindcss | 4.x | Dashboard styling | shadcn/ui foundation |
| zod | 3.x | API validation | Shared between Hono and Next.js |
| @tanstack/react-query | 5.x | Dashboard data fetching | Server state management |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hono | Express | Express is more familiar but heavier; Hono aligns with modern edge patterns |
| Next.js | Remix | Remix has cleaner data mutations but smaller ecosystem; Next.js has more templates |
| shadcn/ui | Material UI | MUI is more complete but heavier; shadcn/ui offers full code ownership |

**Installation:**
```bash
# Bot and API
npm install @slack/bolt hono zod

# Dashboard
npx create-next-app@latest dashboard --typescript --tailwind --app
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input table card command dialog
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── services/
│   ├── query/               # Shared query layer (Phase 2 output)
│   │   ├── asset-query.ts   # findAsset, searchAssets, getHistory
│   │   ├── types.ts         # Query request/response types
│   │   └── index.ts         # Public API
│   └── ...                  # Phase 1 & 2 services
├── api/
│   └── routes/              # Hono API routes
│       ├── assets.ts        # /api/assets endpoints
│       ├── search.ts        # /api/search endpoints
│       └── index.ts         # Router composition
├── bot/
│   ├── app.ts               # Bolt app initialization
│   ├── commands/            # Slash command handlers
│   │   └── vesper.ts        # /vesper command
│   ├── events/              # Event handlers
│   │   └── app-mention.ts   # @vesper mentions
│   ├── views/               # Block Kit view builders
│   │   ├── asset-result.ts  # Single asset display
│   │   ├── search-results.ts # Search results list
│   │   └── error.ts         # Error messages
│   └── index.ts             # Bot entry point
└── dashboard/               # Next.js app (separate package or folder)
    ├── app/
    │   ├── page.tsx         # Home/search
    │   ├── assets/
    │   │   └── [id]/page.tsx # Asset detail + history
    │   └── api/             # Next.js API routes (proxy to Hono)
    └── components/
        ├── search-bar.tsx
        ├── asset-card.tsx
        └── version-timeline.tsx
```

### Pattern 1: Shared Query Service Layer

**What:** All data access goes through a service layer that encapsulates Phase 2 intelligence. Both bot and dashboard call this layer, never the database directly.

**When to use:** Always. This is the core consistency pattern.

**Example:**
```typescript
// src/services/query/asset-query.ts

import { db } from '../../db/client';
import { assets, assetVersions } from '../../db/schema';
import { eq, desc, ilike, or } from 'drizzle-orm';
import { normalizeVietnamese } from '../asset/normalizer';
import Fuse from 'fuse.js';

export interface AssetQueryResult {
  id: string;
  name: string;
  normalizedName: string;
  category: string | null;
  latestVersion: string | null;
  updatedAt: Date;
}

export interface AssetDetailResult extends AssetQueryResult {
  versions: {
    version: string;
    author: string | null;
    authorName: string | null;
    createdAt: Date;
    slackPermalink: string | null;
  }[];
}

export interface SearchParams {
  query: string;
  category?: string;
  limit?: number;
}

export async function searchAssets(params: SearchParams): Promise<AssetQueryResult[]> {
  const { query, category, limit = 10 } = params;
  const normalizedQuery = normalizeVietnamese(query);

  // Database search (exact + pattern)
  let dbQuery = db.select().from(assets);

  if (category) {
    dbQuery = dbQuery.where(eq(assets.category, category));
  }

  const allAssets = await dbQuery;

  // Fuzzy search with Fuse.js
  const fuse = new Fuse(allAssets, {
    keys: ['normalizedName', 'rawName'],
    threshold: 0.4,
    includeScore: true,
  });

  const results = fuse.search(normalizedQuery);
  return results.slice(0, limit).map(r => ({
    id: r.item.id,
    name: r.item.rawName,
    normalizedName: r.item.normalizedName,
    category: r.item.category,
    latestVersion: r.item.latestVersion,
    updatedAt: r.item.updatedAt,
  }));
}

export async function getAssetDetail(assetId: string): Promise<AssetDetailResult | null> {
  const [asset] = await db.select().from(assets).where(eq(assets.id, assetId));

  if (!asset) return null;

  const versions = await db
    .select()
    .from(assetVersions)
    .where(eq(assetVersions.assetId, assetId))
    .orderBy(desc(assetVersions.createdAt));

  return {
    id: asset.id,
    name: asset.rawName,
    normalizedName: asset.normalizedName,
    category: asset.category,
    latestVersion: asset.latestVersion,
    updatedAt: asset.updatedAt,
    versions: versions.map(v => ({
      version: v.version,
      author: v.author,
      authorName: v.authorName,
      createdAt: v.createdAt,
      slackPermalink: v.slackPermalink,
    })),
  };
}

export async function findAssetByName(name: string): Promise<AssetDetailResult | null> {
  const normalizedName = normalizeVietnamese(name);

  const [asset] = await db
    .select()
    .from(assets)
    .where(eq(assets.normalizedName, normalizedName));

  if (!asset) return null;

  return getAssetDetail(asset.id);
}
```

### Pattern 2: Hono API Layer

**What:** Thin HTTP API that wraps the query service. Both the dashboard and external integrations can call this.

**When to use:** For dashboard data fetching and any future integrations.

**Example:**
```typescript
// src/api/routes/assets.ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { searchAssets, getAssetDetail, findAssetByName } from '../../services/query/asset-query';

const app = new Hono();

const searchSchema = z.object({
  q: z.string().min(1),
  category: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(10),
});

app.get('/search', zValidator('query', searchSchema), async (c) => {
  const { q, category, limit } = c.req.valid('query');

  const results = await searchAssets({ query: q, category, limit });

  return c.json({
    ok: true,
    data: results,
    query: q,
  });
});

app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const asset = await getAssetDetail(id);

  if (!asset) {
    return c.json({ ok: false, error: 'Asset not found' }, 404);
  }

  return c.json({ ok: true, data: asset });
});

export default app;
```

### Pattern 3: Slack Bot with Slash Commands + App Mentions

**What:** Support both `/vesper ho ly` (explicit command) and `@vesper ho ly moi nhat?` (natural conversation). Slash commands for structured queries, mentions for natural language.

**When to use:** This dual-mode gives users flexibility.

**Example:**
```typescript
// src/bot/app.ts
import { App, LogLevel } from '@slack/bolt';

export const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: process.env.NODE_ENV === 'development',
  appToken: process.env.SLACK_APP_TOKEN,  // For Socket Mode
  logLevel: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
});

// src/bot/commands/vesper.ts
import { app } from '../app';
import { findAssetByName, searchAssets } from '../../services/query/asset-query';
import { buildAssetResultBlocks, buildSearchResultsBlocks, buildErrorBlocks } from '../views';

app.command('/vesper', async ({ command, ack, respond }) => {
  // MUST ack within 3 seconds
  await ack();

  const query = command.text.trim();

  if (!query) {
    await respond({
      response_type: 'ephemeral',
      blocks: buildErrorBlocks('Please provide an asset name. Example: `/vesper ho ly`'),
    });
    return;
  }

  try {
    // Try exact match first
    const asset = await findAssetByName(query);

    if (asset) {
      await respond({
        response_type: 'in_channel',
        blocks: buildAssetResultBlocks(asset),
      });
      return;
    }

    // Fall back to search
    const results = await searchAssets({ query, limit: 5 });

    if (results.length === 0) {
      await respond({
        response_type: 'ephemeral',
        text: `No assets found matching "${query}"`,
      });
      return;
    }

    await respond({
      response_type: 'in_channel',
      blocks: buildSearchResultsBlocks(results, query),
    });
  } catch (error) {
    console.error('Command error:', error);
    await respond({
      response_type: 'ephemeral',
      blocks: buildErrorBlocks('Something went wrong. Please try again.'),
    });
  }
});

// src/bot/events/app-mention.ts
import { app } from '../app';
import { parseNaturalLanguageQuery } from '../../services/query/nlu';  // Phase 2
import { findAssetByName, searchAssets } from '../../services/query/asset-query';
import { buildAssetResultBlocks, buildSearchResultsBlocks } from '../views';

app.event('app_mention', async ({ event, say }) => {
  // Remove the @mention from the text
  const text = event.text.replace(/<@[A-Z0-9]+>/g, '').trim();

  if (!text) {
    await say({
      thread_ts: event.ts,
      text: 'Hi! Ask me about any asset. For example: "ho ly moi nhat?" or "latest Boss Theme"',
    });
    return;
  }

  try {
    // Use Phase 2 NLU to understand intent
    const parsed = await parseNaturalLanguageQuery(text);

    if (parsed.assetName) {
      const asset = await findAssetByName(parsed.assetName);

      if (asset) {
        await say({
          thread_ts: event.ts,
          blocks: buildAssetResultBlocks(asset),
        });
        return;
      }
    }

    // Search fallback
    const results = await searchAssets({
      query: parsed.assetName || text,
      category: parsed.category,
      limit: 5,
    });

    if (results.length === 0) {
      await say({
        thread_ts: event.ts,
        text: `I couldn't find any assets matching that. Try a different name or check the web dashboard.`,
      });
      return;
    }

    await say({
      thread_ts: event.ts,
      blocks: buildSearchResultsBlocks(results, text),
    });
  } catch (error) {
    console.error('Mention error:', error);
    await say({
      thread_ts: event.ts,
      text: 'Sorry, something went wrong. Please try again.',
    });
  }
});
```

### Pattern 4: Block Kit Response Builder

**What:** Structured functions that build Block Kit JSON for consistent, rich responses.

**When to use:** Every bot response should use Block Kit for better UX.

**Example:**
```typescript
// src/bot/views/asset-result.ts
import type { AssetDetailResult } from '../../services/query/asset-query';
import type { KnownBlock } from '@slack/types';

export function buildAssetResultBlocks(asset: AssetDetailResult): KnownBlock[] {
  const latestVersion = asset.versions[0];

  const blocks: KnownBlock[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: asset.name,
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Category:*\n${asset.category || 'Unknown'}`,
        },
        {
          type: 'mrkdwn',
          text: `*Latest Version:*\n${asset.latestVersion || 'N/A'}`,
        },
      ],
    },
  ];

  if (latestVersion) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Last Updated:* ${formatDate(latestVersion.createdAt)}${
          latestVersion.authorName ? ` by ${latestVersion.authorName}` : ''
        }`,
      },
      accessory: latestVersion.slackPermalink ? {
        type: 'button',
        text: {
          type: 'plain_text',
          text: 'View in Slack',
          emoji: true,
        },
        url: latestVersion.slackPermalink,
        action_id: 'view_slack_message',
      } : undefined,
    });
  }

  // Show version history (up to 3)
  if (asset.versions.length > 1) {
    blocks.push({
      type: 'divider',
    });
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `*Version History:* ${asset.versions
            .slice(0, 3)
            .map(v => `v${v.version}`)
            .join(' <- ')}${asset.versions.length > 3 ? ' ...' : ''}`,
        },
      ],
    });
  }

  return blocks;
}

// src/bot/views/search-results.ts
import type { AssetQueryResult } from '../../services/query/asset-query';
import type { KnownBlock } from '@slack/types';

export function buildSearchResultsBlocks(
  results: AssetQueryResult[],
  query: string
): KnownBlock[] {
  const blocks: KnownBlock[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `Found *${results.length}* assets matching "${query}":`,
      },
    },
    {
      type: 'divider',
    },
  ];

  for (const result of results) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${result.name}*\n${result.category || 'Unknown'} | v${result.latestVersion || '?'}`,
      },
      accessory: {
        type: 'button',
        text: {
          type: 'plain_text',
          text: 'Details',
          emoji: true,
        },
        value: result.id,
        action_id: `asset_details_${result.id}`,
      },
    });
  }

  return blocks;
}

// src/bot/views/error.ts
import type { KnownBlock } from '@slack/types';

export function buildErrorBlocks(message: string): KnownBlock[] {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `:warning: ${message}`,
      },
    },
  ];
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
```

### Anti-Patterns to Avoid

- **Direct database access from bot/dashboard:** Both interfaces MUST use the query service layer. Never import `db` directly into bot or dashboard code.
- **Different query logic in bot vs dashboard:** If you need a new query pattern, add it to the service layer, not inline.
- **Acknowledging after processing:** Always `ack()` immediately, then process. Slack's 3-second timeout is strict.
- **Ignoring Vietnamese input variations:** Always normalize user input before searching.
- **Building Block Kit JSON inline:** Use builder functions for consistency and maintainability.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Block Kit JSON | Manual JSON objects | Builder functions + @slack/types | Type safety, consistency, easier maintenance |
| Slack event handling | Raw HTTP endpoints | Bolt.js | Signature verification, rate limit handling, retry logic |
| Dashboard component library | Custom components | shadcn/ui | Accessible, tested, consistent design system |
| API validation | Manual if/else | Zod + @hono/zod-validator | Type inference, reusable schemas |
| Vietnamese text normalization | Custom function | Reuse Phase 1 normalizer | Single source of truth |
| Fuzzy search | Custom string matching | Fuse.js | Already proven in Phase 1 |

**Key insight:** The bot and dashboard are presentation layers. All intelligence lives in the query service (Phase 2). Keep the UI code thin.

## Common Pitfalls

### Pitfall 1: Slack 3-Second Timeout Failures

**What goes wrong:** Bot shows "operation_timeout" error even though processing succeeded. User loses confidence.

**Why it happens:** Any processing before `ack()` takes too long. Cold starts in serverless can exceed 3 seconds alone.

**How to avoid:**
1. Always `ack()` FIRST, before any async work
2. Use `respond()` or `say()` for actual responses after ack
3. For long operations, ack with "Processing..." message, then update
4. In production, avoid serverless cold starts (keep containers warm) or use response_url

**Warning signs:** Intermittent "operation_timeout" errors, especially under load or cold starts

### Pitfall 2: Vietnamese Input Not Normalized

**What goes wrong:** User types "ho ly" but asset is stored as "Hồ Ly" - no results found. Or worse, searching works in dashboard but not bot (or vice versa).

**Why it happens:** Inconsistent normalization between bot text parsing and search logic.

**How to avoid:**
1. Single normalization function used EVERYWHERE (already built in Phase 1)
2. Query service layer handles normalization internally
3. Bot and dashboard pass raw user input; service normalizes
4. Test with Vietnamese diacritics explicitly

**Warning signs:** "Works in one interface but not the other", users reporting "can't find asset that exists"

### Pitfall 3: Slash Command Thread Limitation

**What goes wrong:** User tries `/vesper ho ly` in a thread, gets error or unexpected behavior.

**Why it happens:** Slack slash commands cannot be invoked in message threads - this is a Slack limitation.

**How to avoid:**
1. Document this limitation clearly
2. Guide users to use @mentions in threads instead
3. Bot help text should explain: "Use /vesper in channels, @vesper in threads"

**Warning signs:** User confusion, support requests about "command not working"

### Pitfall 4: Inconsistent Results Between Interfaces

**What goes wrong:** Dashboard shows 5 results, bot shows 3 for the same query. Users distrust the system.

**Why it happens:** Duplicate query logic, different sorting, different limits, different normalization.

**How to avoid:**
1. SINGLE query service layer (cannot stress this enough)
2. Both interfaces call exact same function with same parameters
3. Default limits should be consistent or configurable
4. Test same query in both interfaces as part of verification

**Warning signs:** "I searched in Slack and got X, but dashboard shows Y"

### Pitfall 5: Block Kit Character Limits

**What goes wrong:** Rich message fails to send, or content is truncated unexpectedly.

**Why it happens:** Block Kit has limits: 50 blocks per message, 3000 chars per text block, 24 chars for modal titles.

**How to avoid:**
1. Truncate long asset names in displays
2. Limit search results (5-10 max in bot, paginate in dashboard)
3. Version history shows only recent 3-5 in bot
4. Full history available via "View in Dashboard" link

**Warning signs:** Messages not sending, "invalid_blocks" errors, truncated content

## Code Examples

### Dashboard Search Page (Next.js + shadcn/ui)

```typescript
// dashboard/app/page.tsx
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

async function searchAssets(query: string, category?: string) {
  if (!query) return [];
  const params = new URLSearchParams({ q: query });
  if (category) params.set('category', category);

  const res = await fetch(`/api/assets/search?${params}`);
  const data = await res.json();
  return data.data;
}

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>();

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['search', query, category],
    queryFn: () => searchAssets(query, category),
    enabled: query.length > 0,
  });

  return (
    <main className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Vesper Asset Tracker</h1>

      <div className="mb-8">
        <Input
          placeholder="Search assets... (e.g., Ho Ly, Boss Theme)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-md"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {results.map((asset: any) => (
          <Link key={asset.id} href={`/assets/${asset.id}`}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {asset.name}
                  <Badge variant="secondary">{asset.category}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Latest: v{asset.latestVersion || '?'}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {isLoading && <p>Searching...</p>}
      {query && results.length === 0 && !isLoading && (
        <p className="text-muted-foreground">No assets found matching "{query}"</p>
      )}
    </main>
  );
}
```

### Dashboard Asset Detail Page

```typescript
// dashboard/app/assets/[id]/page.tsx
import { notFound } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

async function getAsset(id: string) {
  const res = await fetch(`${process.env.API_URL}/api/assets/${id}`, {
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.data;
}

export default async function AssetPage({ params }: { params: { id: string } }) {
  const asset = await getAsset(params.id);

  if (!asset) {
    notFound();
  }

  return (
    <main className="container mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-4">
          {asset.name}
          <Badge>{asset.category}</Badge>
        </h1>
        <p className="text-muted-foreground">
          Latest version: {asset.latestVersion}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Version History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {asset.versions.map((version: any, i: number) => (
              <div
                key={version.version + version.createdAt}
                className="flex items-center gap-4 pb-4 border-b last:border-0"
              >
                <div className="w-16 font-mono font-bold">
                  v{version.version}
                </div>
                <div className="flex-1">
                  <p className="font-medium">
                    {version.authorName || 'Unknown'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(version.createdAt).toLocaleDateString('vi-VN')}
                  </p>
                </div>
                {version.slackPermalink && (
                  <a
                    href={version.slackPermalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    View in Slack
                  </a>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
```

### Interactive Asset Selection Modal

```typescript
// src/bot/interactions/asset-select-modal.ts
import { app } from '../app';
import { searchAssets } from '../../services/query/asset-query';

// Handle external_select options loading
app.options('asset_search_select', async ({ options, ack }) => {
  const query = options.value || '';

  if (query.length < 2) {
    await ack({ options: [] });
    return;
  }

  const results = await searchAssets({ query, limit: 10 });

  await ack({
    options: results.map(asset => ({
      text: {
        type: 'plain_text',
        text: `${asset.name} (${asset.category || 'Unknown'})`,
      },
      value: asset.id,
    })),
  });
});

// Open search modal from button click
app.action('open_search_modal', async ({ ack, body, client }) => {
  await ack();

  await client.views.open({
    trigger_id: (body as any).trigger_id,
    view: {
      type: 'modal',
      callback_id: 'asset_search_modal',
      title: {
        type: 'plain_text',
        text: 'Search Assets',  // Max 24 chars!
      },
      submit: {
        type: 'plain_text',
        text: 'View Details',
      },
      blocks: [
        {
          type: 'input',
          block_id: 'asset_input',
          element: {
            type: 'external_select',
            action_id: 'asset_search_select',
            placeholder: {
              type: 'plain_text',
              text: 'Type to search...',
            },
            min_query_length: 2,
          },
          label: {
            type: 'plain_text',
            text: 'Asset Name',
          },
        },
      ],
    },
  });
});

// Handle modal submission
app.view('asset_search_modal', async ({ ack, view, body, client }) => {
  await ack();

  const assetId = view.state.values.asset_input.asset_search_select.selected_option?.value;

  if (!assetId) return;

  // Post asset details to user's DM or original channel
  // Implementation depends on where the modal was opened from
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Legacy message attachments | Block Kit | 2019+ | Must use Block Kit for rich formatting |
| RTM API for bots | Events API + Socket Mode | 2020+ | RTM deprecated for new apps |
| Socket Mode for production | HTTP Events API | 2024+ | Socket Mode for dev only |
| Custom CSS frameworks | Tailwind + shadcn/ui | 2023+ | Component ownership pattern |
| Express for APIs | Hono/Fastify | 2024+ | Lighter, edge-compatible |
| Create React App | Next.js App Router | 2023+ | Server components, better DX |

**Deprecated/outdated:**
- Message attachments (use Block Kit blocks instead)
- RTM API (use Events API)
- `interactive_message` callbacks (use `block_actions`)

## Open Questions

Things that couldn't be fully resolved:

1. **Socket Mode vs HTTP for production**
   - What we know: Socket Mode avoids public endpoints, HTTP is more reliable at scale
   - What's unclear: Team's infrastructure and security requirements
   - Recommendation: Start with Socket Mode (simpler), plan migration to HTTP if scale demands

2. **Dashboard deployment location**
   - What we know: Can run alongside bot in same Docker Compose, or separate deployment
   - What's unclear: Team's DevOps preferences, existing infrastructure
   - Recommendation: Same Docker Compose initially, separate if different scaling needs emerge

3. **Authentication for dashboard**
   - What we know: Internal tool, likely doesn't need auth initially
   - What's unclear: Whether IT requires auth for internal tools
   - Recommendation: Ship without auth first, add Slack OAuth or basic auth if required

## Sources

### Primary (HIGH confidence)
- [Slack Bolt.js Quickstart](https://docs.slack.dev/tools/bolt-js/getting-started/) - App setup, Socket Mode
- [Slack Block Kit Overview](https://docs.slack.dev/block-kit/) - Block limits, component types
- [Slack Select Menu Elements](https://docs.slack.dev/reference/block-kit/block-elements/select-menu-element/) - External select, dynamic options
- [Slack Modals Documentation](https://docs.slack.dev/surfaces/modals) - Modal structure, submissions
- [Hono Getting Started](https://hono.dev/docs/getting-started/basic) - API setup, routing
- [Hono Web API Example](https://hono.dev/examples/web-api) - REST patterns

### Secondary (MEDIUM confidence)
- [Implementing Slash Commands](https://docs.slack.dev/interactivity/implementing-slash-commands/) - Command best practices
- [Bolt.js TypeScript Example](https://github.com/slackapi/bolt-js/blob/main/examples/getting-started-typescript/src/app.ts) - TypeScript patterns
- [shadcn/ui Dashboard Templates](https://www.shadcn.io/template) - Component patterns
- [Next.js Admin Dashboard Guide](https://www.traversymedia.com/blog/nextjs-admin-dashboard-project) - Dashboard architecture

### Tertiary (LOW confidence)
- [Scalable Slack Bot Design (Medium)](https://medium.com/@geetansh2k1/scalable-serverless-slack-bot-design-avoid-slacks-3-second-timeout-with-aws-lambda-sqs-7c91367c161d) - Timeout handling patterns
- [Slack Bot Anti-patterns (Medium)](https://medium.com/@aditya071193/how-to-not-develop-a-slackbot-a75b57783b56) - Common mistakes

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Bolt.js already in Phase 1, Hono/Next.js well-documented
- Architecture: HIGH - Service layer pattern is established, Block Kit is well-documented
- Pitfalls: MEDIUM - Some based on community reports, not official docs

**Research date:** 2026-01-23
**Valid until:** 2026-02-23 (30 days - Slack APIs stable, framework ecosystem evolving slowly)
