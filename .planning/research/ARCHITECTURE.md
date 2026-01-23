# Architecture Research

**Domain:** Slack-integrated asset version tracking with AI summarization
**Researched:** 2026-01-23
**Confidence:** HIGH

## System Overview

```
                          ┌─────────────────────────────────────────┐
                          │            EXTERNAL SERVICES            │
                          │                                         │
                          │  ┌─────────┐     ┌──────────────────┐  │
                          │  │  Slack  │     │  OpenAI/Claude   │  │
                          │  │   API   │     │       API        │  │
                          │  └────┬────┘     └────────┬─────────┘  │
                          │       │                   │            │
                          └───────┼───────────────────┼────────────┘
                                  │                   │
        ┌─────────────────────────┼───────────────────┼─────────────────────────┐
        │                   APPLICATION LAYER                                   │
        │                                                                       │
        │  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────┐  │
        │  │  Slack Bot     │  │  Scheduled     │  │  Next.js Web App       │  │
        │  │  (Bolt SDK)    │  │  Processor     │  │  (Dashboard + API)     │  │
        │  │                │  │  (node-cron)   │  │                        │  │
        │  │ • Commands     │  │                │  │ • Dashboard pages      │  │
        │  │ • NLU queries  │  │ • Daily scrape │  │ • API routes           │  │
        │  │ • Responses    │  │ • AI summary   │  │ • Search/browse        │  │
        │  └───────┬────────┘  └───────┬────────┘  └───────────┬────────────┘  │
        │          │                   │                       │               │
        │          └───────────────────┼───────────────────────┘               │
        │                              │                                       │
        └──────────────────────────────┼───────────────────────────────────────┘
                                       │
        ┌──────────────────────────────┼───────────────────────────────────────┐
        │                        SERVICE LAYER                                 │
        │                                                                      │
        │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │
        │  │  Slack       │  │  AI          │  │  Asset       │  │  Query   │ │
        │  │  Service     │  │  Service     │  │  Service     │  │  Service │ │
        │  │              │  │              │  │              │  │          │ │
        │  │ • Fetch msgs │  │ • Summarize  │  │ • Parse ver  │  │ • Search │ │
        │  │ • Channel    │  │ • NLU parse  │  │ • Track      │  │ • Filter │ │
        │  │   metadata   │  │ • Extract    │  │ • History    │  │ • Format │ │
        │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────┘ │
        │                                                                      │
        └──────────────────────────────────────────────────────────────────────┘
                                       │
        ┌──────────────────────────────┼───────────────────────────────────────┐
        │                         DATA LAYER                                   │
        │                                                                      │
        │  ┌────────────────────────────────────────────────────────────────┐  │
        │  │                    PostgreSQL Database                         │  │
        │  │                                                                │  │
        │  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌────────────┐  │  │
        │  │  │ channels  │  │  assets   │  │ versions  │  │ summaries  │  │  │
        │  │  └───────────┘  └───────────┘  └───────────┘  └────────────┘  │  │
        │  │                                                                │  │
        │  │  ┌──────────────────┐  ┌─────────────────────┐                │  │
        │  │  │ slack_messages   │  │ processing_logs     │                │  │
        │  │  │ (JSONB)          │  │                     │                │  │
        │  │  └──────────────────┘  └─────────────────────┘                │  │
        │  │                                                                │  │
        │  └────────────────────────────────────────────────────────────────┘  │
        │                                                                      │
        └──────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|----------------|-------------------|
| **Slack Bot (Bolt SDK)** | Handle user queries from Slack, parse intent, return formatted responses | Slack API, Query Service, AI Service |
| **Scheduled Processor** | Run daily: scrape channels, extract assets, generate summaries | Slack Service, AI Service, Asset Service |
| **Next.js Web App** | Dashboard UI, API endpoints for web queries, search/browse interface | Asset Service, Query Service |
| **Slack Service** | Fetch messages from Slack API, handle pagination, manage rate limits | Slack API, Database |
| **AI Service** | Summarize daily updates, parse natural language queries, extract asset info | OpenAI/Claude API |
| **Asset Service** | Parse version strings, track asset history, CRUD operations on assets | Database |
| **Query Service** | Search assets, filter by category/date, format responses | Database, Asset Service |

## Recommended Project Structure

```
vesper/
├── apps/
│   ├── web/                      # Next.js dashboard
│   │   ├── app/
│   │   │   ├── page.tsx          # Dashboard home
│   │   │   ├── assets/           # Asset browsing pages
│   │   │   ├── summaries/        # Daily summary pages
│   │   │   └── api/              # API routes
│   │   │       ├── assets/
│   │   │       ├── search/
│   │   │       └── summaries/
│   │   └── components/           # React components
│   │
│   └── bot/                      # Slack bot (Bolt SDK)
│       ├── src/
│       │   ├── index.ts          # Bot entry point
│       │   ├── handlers/         # Slack event handlers
│       │   │   ├── commands.ts
│       │   │   ├── messages.ts
│       │   │   └── actions.ts
│       │   └── utils/            # Bot utilities
│       └── package.json
│
├── packages/
│   ├── core/                     # Shared business logic
│   │   ├── services/
│   │   │   ├── slack.ts          # Slack API wrapper
│   │   │   ├── ai.ts             # AI/LLM service
│   │   │   ├── asset.ts          # Asset management
│   │   │   └── query.ts          # Query/search logic
│   │   ├── types/                # Shared TypeScript types
│   │   └── utils/                # Shared utilities
│   │
│   ├── database/                 # Database schema & client
│   │   ├── schema.ts             # Drizzle/Prisma schema
│   │   ├── migrations/           # Database migrations
│   │   └── client.ts             # Database client
│   │
│   └── config/                   # Shared configuration
│       ├── eslint/
│       └── typescript/
│
├── scripts/
│   └── daily-processor.ts        # Scheduled job script
│
├── turbo.json                    # Turborepo configuration
├── pnpm-workspace.yaml           # pnpm workspace config
└── package.json
```

### Structure Rationale

- **apps/**: Separate deployable units — web dashboard and Slack bot can scale independently
- **packages/core/**: Shared business logic ensures consistency between bot queries and web queries
- **packages/database/**: Single source of truth for schema, migrations, and database access
- **scripts/**: Standalone scheduled tasks that can run as cron jobs or containerized workers
- **Monorepo**: Turborepo + pnpm enables code sharing while maintaining clear boundaries

## Architectural Patterns

### Pattern 1: Unified Query Layer

**What:** Both Slack bot and web dashboard use the same Query Service for asset searches

**When to use:** Anytime multiple interfaces need consistent behavior

**Trade-offs:**
- PRO: Single source of truth for search logic
- PRO: Easier to maintain and test
- CON: Shared dependencies between apps

**Example:**
```typescript
// packages/core/services/query.ts
export class QueryService {
  async searchAssets(query: string, filters?: AssetFilters): Promise<Asset[]> {
    // Same logic used by bot AND web
    const parsed = await this.aiService.parseQuery(query);
    return this.assetService.search(parsed, filters);
  }
}

// apps/bot/src/handlers/messages.ts
app.message(async ({ message, say }) => {
  const results = await queryService.searchAssets(message.text);
  await say(formatSlackResponse(results));
});

// apps/web/app/api/search/route.ts
export async function GET(request: Request) {
  const { query } = parseSearchParams(request);
  const results = await queryService.searchAssets(query);
  return Response.json(results);
}
```

### Pattern 2: Scheduled Batch Processing

**What:** Daily cron job scrapes Slack channels, processes messages, generates summaries

**When to use:** When real-time sync isn't required and batch processing simplifies architecture

**Trade-offs:**
- PRO: Simpler than event-driven architecture
- PRO: Easier to reason about, debug, and retry
- PRO: Slack rate limits are less of a concern with daily batches
- CON: Data is up to 24 hours stale

**Example:**
```typescript
// scripts/daily-processor.ts
import cron from 'node-cron';

// Run at 6:00 AM daily (after overnight work is posted)
cron.schedule('0 6 * * *', async () => {
  const yesterday = getYesterdayRange();

  for (const channel of TRACKED_CHANNELS) {
    // 1. Fetch messages from Slack
    const messages = await slackService.fetchMessages(channel, yesterday);

    // 2. Store raw messages (JSONB for flexibility)
    await db.storeRawMessages(channel, messages);

    // 3. Extract asset versions
    const assets = await assetService.extractFromMessages(messages);
    await db.upsertAssets(assets);

    // 4. Generate AI summary
    const summary = await aiService.summarizeDaily(channel, messages);
    await db.storeSummary(channel, yesterday.date, summary);
  }
});
```

### Pattern 3: Hybrid Schema (Structured + JSONB)

**What:** Store frequently-queried fields as columns, keep full Slack payloads in JSONB

**When to use:** When you need both query performance and payload flexibility

**Trade-offs:**
- PRO: Fast queries on indexed columns (channel, timestamp, asset name)
- PRO: Full Slack message preserved for future features (attachments, reactions, threads)
- CON: Slightly more complex schema
- CON: Larger storage footprint than pure relational

**Example:**
```sql
-- Structured columns for queries
CREATE TABLE assets (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,              -- "Ho Ly", "Boss Theme"
    category TEXT NOT NULL,          -- "3d_model", "sound", "animation"
    latest_version TEXT,             -- "v2.1"
    updated_at TIMESTAMP NOT NULL
);

-- JSONB for flexible message storage
CREATE TABLE slack_messages (
    id SERIAL PRIMARY KEY,
    channel_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    message_ts TIMESTAMP NOT NULL,   -- Slack timestamp (unique ID)
    message_data JSONB NOT NULL,     -- Full Slack payload
    processed_at TIMESTAMP
);

-- GIN index for searching within message content
CREATE INDEX idx_slack_messages_data ON slack_messages USING GIN (message_data);
```

## Data Flow

### Flow 1: Daily Scrape & Summarize

```
┌─────────────┐
│  Cron Job   │ (6:00 AM daily)
│  Triggers   │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│   Slack Service     │
│   • Fetch messages  │
│   • Paginate        │──────────────► Slack API (conversations.history)
│   • Handle limits   │
└──────┬──────────────┘
       │ raw messages
       ▼
┌─────────────────────┐
│   Asset Service     │
│   • Parse names     │
│   • Extract version │
│   • Match category  │
└──────┬──────────────┘
       │ structured assets
       ▼
┌─────────────────────┐
│   AI Service        │
│   • Summarize day   │──────────────► OpenAI/Claude API
│   • Extract context │
└──────┬──────────────┘
       │ summary text
       ▼
┌─────────────────────┐
│   Database          │
│   • Store messages  │
│   • Upsert assets   │
│   • Save summary    │
└─────────────────────┘
```

### Flow 2: User Query (Slack Bot)

```
┌─────────────┐
│  User asks  │ "Ho Ly moi nhat?"
│  in Slack   │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│   Slack Bolt SDK    │
│   • Receive event   │◄─────────────  Slack Events API / Socket Mode
│   • Parse message   │
└──────┬──────────────┘
       │ text query
       ▼
┌─────────────────────┐
│   AI Service        │
│   • Parse intent    │──────────────► OpenAI/Claude API
│   • Extract entity  │
│   • Understand NL   │
└──────┬──────────────┘
       │ structured query { asset: "Ho Ly", want: "latest" }
       ▼
┌─────────────────────┐
│   Query Service     │
│   • Search DB       │
│   • Filter results  │
└──────┬──────────────┘
       │ Asset[]
       ▼
┌─────────────────────┐
│   Format Response   │
│   • Slack blocks    │
│   • Include links   │
└──────┬──────────────┘
       │
       ▼
┌─────────────┐
│  Bot posts  │ "Ho Ly - v2.1 (3D Model) - updated 2h ago"
│  response   │
└─────────────┘
```

### Flow 3: Web Dashboard Browse

```
┌─────────────┐
│  User opens │ /dashboard/assets
│  web app    │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│   Next.js Page      │
│   • Server render   │
│   • Fetch data      │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│   API Route         │
│   /api/assets       │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│   Query Service     │
│   • List assets     │
│   • Group by cat    │
│   • Include history │
└──────┬──────────────┘
       │ Asset[] with versions
       ▼
┌─────────────────────┐
│   Render Dashboard  │
│   • Asset cards     │
│   • Version history │
│   • Daily summaries │
└─────────────────────┘
```

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **Slack API** | HTTP via @slack/web-api, Events via @slack/bolt | Use HTTP (not Socket Mode) for production reliability. Rate limits: Tier 3 for Marketplace apps, stricter for non-Marketplace |
| **OpenAI API** | HTTP via openai SDK | Use structured output (JSON mode) for reliable parsing. Consider prompt caching for repeated system prompts |
| **PostgreSQL** | Connection pool via database driver | Use connection pooling. JSONB indexes for message search |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| **Bot <-> Core Services** | Direct import (monorepo) | Same TypeScript types, no serialization |
| **Web <-> Core Services** | Direct import (monorepo) | Server-side rendering uses services directly |
| **Cron <-> Core Services** | Direct import (monorepo) | Script runs as separate process but shares code |
| **Web Client <-> API** | HTTP REST (Next.js API routes) | Standard JSON responses |

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-100 users (MVP) | Single server, SQLite or small PostgreSQL, simple cron job |
| 100-1k users | PostgreSQL with connection pooling, add response caching |
| 1k+ users | Separate bot and web deployments, Redis for caching, consider queue for AI calls |

### Scaling Priorities

1. **First bottleneck: AI API calls** - Rate limits and latency. Add response caching for repeated queries (same asset lookup)
2. **Second bottleneck: Database queries** - Add indexes on frequently-queried columns (asset_name, category, updated_at)
3. **Third bottleneck: Slack API limits** - For non-Marketplace apps, stricter limits apply. Consider applying to Marketplace if needed

## Anti-Patterns

### Anti-Pattern 1: Real-Time Sync Overkill

**What people do:** Build event-driven architecture with webhooks for every Slack message
**Why it's wrong:** Complexity explosion for a use case where daily batch is sufficient. More moving parts, harder to debug, more failure modes
**Do this instead:** Start with daily batch processing. Add more frequent sync only if users explicitly need it

### Anti-Pattern 2: Separate Codebases for Bot and Web

**What people do:** Two separate repos with duplicated types, services, and database code
**Why it's wrong:** Drift between implementations, bugs fixed in one place not the other, inconsistent behavior
**Do this instead:** Monorepo with shared packages. Both apps import from packages/core

### Anti-Pattern 3: Pure Relational Schema for Slack Messages

**What people do:** Model every Slack message field as database columns
**Why it's wrong:** Slack message schema is complex (blocks, attachments, reactions, threads). Schema changes require migrations
**Do this instead:** Hybrid approach - columns for indexed/queryable fields, JSONB for full payload

### Anti-Pattern 4: Socket Mode in Production

**What people do:** Use Socket Mode for production Slack bot because it's easier to set up
**Why it's wrong:** Socket Mode uses long-lived WebSocket connections that can disconnect. Slack recommends HTTP for production reliability
**Do this instead:** Use HTTP (Events API) for production. Socket Mode is fine for local development

## Build Order (Dependencies)

Based on component dependencies, recommended build order:

```
Phase 1: Foundation
├── Database schema (all other components depend on this)
├── Core services (slack, asset, query - business logic)
└── Local dev environment

Phase 2: Data Pipeline
├── Slack API integration (need IT approval first)
├── Message scraping & storage
└── Asset extraction (version parsing)

Phase 3: AI Integration
├── AI service (summarization, NLU)
├── Daily processor (ties scraping + AI together)
└── Summary storage

Phase 4: User Interfaces
├── Slack bot (queries existing data)
├── Web dashboard (queries existing data)
└── Search functionality

Phase 5: Polish
├── Error handling & monitoring
├── Performance optimization
└── UI/UX refinement
```

**Key dependency insight:** Slack API approval (IT dependency) should start in Phase 1 even though implementation is Phase 2. It's a common blocker.

## Sources

- [Slack Events API vs Socket Mode Comparison](https://docs.slack.dev/apis/events-api/comparing-http-socket-mode/)
- [Slack Bolt SDK for JavaScript](https://tools.slack.dev/bolt-js/)
- [conversations.history API](https://docs.slack.dev/reference/methods/conversations.history/)
- [PostgreSQL JSONB Best Practices](https://aws.amazon.com/blogs/database/postgresql-as-a-json-database-advanced-patterns-and-best-practices/)
- [Next.js App Router Project Structure](https://makerkit.dev/blog/tutorials/nextjs-app-router-project-structure)
- [Node.js Cron Job Scheduling](https://betterstack.com/community/guides/scaling-nodejs/node-cron-scheduled-tasks/)
- [OpenAI Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs)
- [Multi-Agent Design Patterns 2026](https://www.infoq.com/news/2026/01/multi-agent-design-patterns/)

---
*Architecture research for: Vesper - Slack Asset Tracker*
*Researched: 2026-01-23*
