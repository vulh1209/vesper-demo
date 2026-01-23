# Technology Stack

**Project:** Vesper - Slack-Integrated Asset Version Tracking System
**Researched:** 2026-01-23
**Overall Confidence:** HIGH

---

## Executive Summary

For a Slack-integrated asset tracking system with AI summarization, the recommended stack is:

- **Runtime:** Node.js (TypeScript) - unified language across bot, API, and dashboard
- **Slack Integration:** Bolt for JavaScript with Socket Mode
- **AI/LLM:** Anthropic Claude API (Sonnet 4) for summarization and intent detection
- **Web Dashboard:** Next.js 15+ with App Router, shadcn/ui, Tailwind CSS v4
- **Database:** PostgreSQL with Drizzle ORM
- **Job Scheduling:** BullMQ with Redis for daily batch processing
- **Deployment:** Vercel (dashboard) + Railway/Render (bot + workers)

---

## Core Technologies

### 1. Slack Bot Framework

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| **@slack/bolt** | 4.6.0 | Slack app framework | HIGH |

**Why Bolt for JavaScript:**
- Official Slack framework, actively maintained
- Socket Mode eliminates need for public URL during development
- Built-in event handling, OAuth, request verification
- Feature parity with Python version, choose based on team expertise
- Legacy bot migration deadline passed (March 2025) - Bolt is the only supported path

**Configuration:**
```typescript
import { App } from '@slack/bolt';

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,  // No public URL needed
  appToken: process.env.SLACK_APP_TOKEN,
});
```

**Critical Permission Scopes Required:**
| Scope | Purpose |
|-------|---------|
| `channels:history` | Read messages from public channels |
| `channels:read` | List channels |
| `channels:join` | Allow bot to join channels |
| `chat:write` | Post messages |
| `users:read` | Get user info for attribution |
| `files:read` | Access shared files (asset attachments) |

**Rate Limit Warning (2025 Change):**
As of May 29, 2025, `conversations.history` for non-Marketplace apps is limited to:
- 1 request per minute
- Max 15 objects per request

This significantly impacts scraping strategy. Mitigations:
1. Apply to Slack Marketplace for higher limits
2. Use incremental syncing with `oldest`/`latest` params
3. Cache aggressively, only fetch new messages

Sources:
- [Slack Bolt Documentation](https://tools.slack.dev/bolt-js/)
- [conversations.history API](https://docs.slack.dev/reference/methods/conversations.history/)

---

### 2. AI/LLM Provider

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| **@anthropic-ai/sdk** | 0.71.2 | AI summarization and intent detection | HIGH |

**Why Anthropic Claude over OpenAI:**

| Factor | Claude | GPT-4 | Winner |
|--------|--------|-------|--------|
| Long-context summarization | 200K+ tokens | 128K tokens | Claude |
| Cost (per 1M tokens) | $3 input / $15 output | $5 input / $15 output | Claude |
| Document analysis | Native strength | Good | Claude |
| Structured output | Excellent | Excellent | Tie |

**Recommended Model:** Claude Sonnet 4 (claude-sonnet-4-20250514)
- Best balance of quality and cost for summarization
- Opus for complex reasoning (not needed for summarization)
- Haiku if cost is primary concern

**Usage Pattern:**
```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

// Daily summarization
const summary = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 4096,
  messages: [{
    role: 'user',
    content: `Summarize these Slack messages about asset updates.
    Extract: asset name, version, author, status (draft/review/approved).

    Messages:
    ${messages.map(m => `[${m.author}]: ${m.text}`).join('\n')}`
  }]
});

// Intent detection for natural language queries
const intent = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  system: `You are an intent classifier for an asset tracking bot.
  Extract: query_type (latest_version, history, search), asset_name, filters.
  Return JSON only.`,
  messages: [{ role: 'user', content: userQuery }]
});
```

**Do NOT use LangChain** for this project:
- Overkill for straightforward summarization
- Adds complexity without benefit
- Direct SDK calls are cleaner for this use case
- LangChain is better suited for complex agent workflows, RAG pipelines

**Consider Vercel AI SDK** if you want streaming responses in the dashboard:
- Integrates well with Next.js
- Can use alongside direct Anthropic SDK

Sources:
- [Claude vs GPT Comparison](https://zapier.com/blog/claude-vs-chatgpt/)
- [Anthropic API Documentation](https://docs.anthropic.com/)

---

### 3. Web Dashboard

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| **Next.js** | 16.1.4 | React framework | HIGH |
| **React** | 19.x | UI library | HIGH |
| **Tailwind CSS** | 4.1.x | Styling | HIGH |
| **shadcn/ui** | latest | Component library | HIGH |

**Why Next.js 15+ (App Router):**
- Server Components for fast initial load
- Built-in API routes for backend endpoints
- ISR for caching summaries (revalidate on new data)
- Streaming for large summary displays
- Excellent Vercel deployment integration

**Project Structure:**
```
src/
├── app/
│   ├── api/
│   │   ├── assets/route.ts
│   │   └── summaries/route.ts
│   ├── dashboard/
│   │   ├── page.tsx
│   │   └── [assetId]/page.tsx
│   └── layout.tsx
├── components/
│   └── ui/  # shadcn components
├── lib/
│   ├── db.ts
│   └── slack.ts
└── services/
    └── summarization.ts
```

**Why shadcn/ui:**
- Not a component library - copy-paste components you own
- Built on Radix UI primitives (accessible)
- Tailwind-native styling
- Dashboard components available (tables, charts, command palette)
- Easily customizable for brand

**Why Tailwind v4:**
- 5x faster builds (Oxide engine)
- CSS-first configuration
- Container queries built-in
- Modern color palette (oklch)

Sources:
- [Next.js App Router](https://nextjs.org/docs/app)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS v4](https://tailwindcss.com/blog/tailwindcss-v4)

---

### 4. Database

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| **PostgreSQL** | 16.x | Primary database | HIGH |
| **Drizzle ORM** | 0.45.1 | Type-safe database access | HIGH |

**Why PostgreSQL over SQLite:**

| Factor | PostgreSQL | SQLite | Winner |
|--------|------------|--------|--------|
| Concurrent access | Excellent | Poor | PostgreSQL |
| Full-text search | Built-in | Limited | PostgreSQL |
| JSONB for flexible data | Native | No | PostgreSQL |
| Scalability | Unlimited | ~GB scale | PostgreSQL |
| Hosted options | Many (Neon, Supabase) | Limited | PostgreSQL |

For a multi-user dashboard with concurrent writes from Slack scraping, PostgreSQL is the clear choice.

**Why Drizzle ORM over Prisma:**

| Factor | Drizzle | Prisma | Winner |
|--------|---------|--------|--------|
| Bundle size | ~7kb | Large (Rust binary) | Drizzle |
| Cold start | Negligible | Measurable | Drizzle |
| Code-first schema | Yes | No (schema file) | Drizzle |
| No codegen needed | Yes | No (prisma generate) | Drizzle |
| SQL-like API | Yes | Abstracted | Drizzle |
| Edge/Serverless | Excellent | Requires adapters | Drizzle |

**Schema Example:**
```typescript
// src/lib/db/schema.ts
import { pgTable, text, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';

export const assets = pgTable('assets', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(), // character, sound, concept, animation, ui
  currentVersion: text('current_version'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const assetVersions = pgTable('asset_versions', {
  id: text('id').primaryKey(),
  assetId: text('asset_id').references(() => assets.id),
  version: text('version').notNull(),
  status: text('status').notNull(), // draft, review, approved
  author: text('author'),
  slackMessageTs: text('slack_message_ts'),
  slackChannelId: text('slack_channel_id'),
  summary: text('summary'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const dailySummaries = pgTable('daily_summaries', {
  id: text('id').primaryKey(),
  date: timestamp('date').notNull(),
  channelId: text('channel_id').notNull(),
  summary: text('summary').notNull(),
  assetUpdates: jsonb('asset_updates'), // [{assetId, version, status}]
  createdAt: timestamp('created_at').defaultNow(),
});
```

**Recommended Hosted PostgreSQL:**
- **Neon** - Serverless, generous free tier, branching for dev
- **Supabase** - PostgreSQL + extras, good free tier
- **Railway** - Simple, good DX

Sources:
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Drizzle vs Prisma Comparison](https://www.bytebase.com/blog/drizzle-vs-prisma/)

---

### 5. Job Scheduling

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| **BullMQ** | 5.66.7 | Job queue for scheduled tasks | HIGH |
| **Redis** | 7.x | BullMQ backend | HIGH |

**Why BullMQ over node-cron:**

| Factor | BullMQ | node-cron | Winner |
|--------|--------|-----------|--------|
| Job persistence | Yes (Redis) | No (in-memory) | BullMQ |
| Retry on failure | Built-in | Manual | BullMQ |
| Horizontal scaling | Yes | No | BullMQ |
| Job monitoring | Yes (Bull Board) | No | BullMQ |
| Survives restarts | Yes | No | BullMQ |

For daily batch processing that must not be missed, BullMQ's persistence is essential.

**Usage Pattern:**
```typescript
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis(process.env.REDIS_URL);

// Define the queue
const summaryQueue = new Queue('daily-summaries', { connection });

// Schedule daily job (runs at 6 AM)
await summaryQueue.upsertJobScheduler(
  'daily-summary',
  { pattern: '0 6 * * *' },  // cron expression
  { name: 'generate-summary' }
);

// Worker to process jobs
const worker = new Worker('daily-summaries', async (job) => {
  // 1. Fetch messages from Slack channels (last 24 hours)
  // 2. Send to Claude for summarization
  // 3. Extract asset updates
  // 4. Store in database
  // 5. Optionally post summary to Slack
}, { connection });
```

**Redis Hosting:**
- **Upstash** - Serverless Redis, pay-per-request, generous free tier
- **Railway** - Redis add-on
- **Redis Cloud** - Official hosted option

Sources:
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Better Stack BullMQ Guide](https://betterstack.com/community/guides/scaling-nodejs/bullmq-scheduled-tasks/)

---

## Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **zod** | 3.x | Schema validation | Validate API inputs, LLM outputs |
| **date-fns** | 3.x | Date manipulation | Formatting timestamps |
| **ioredis** | 5.x | Redis client | BullMQ connection |
| **@vercel/ai** | 4.x | AI streaming | If streaming summaries in dashboard |
| **lucide-react** | latest | Icons | Dashboard icons |
| **@tanstack/react-query** | 5.x | Data fetching | Client-side data management |
| **recharts** | 2.x | Charts | Dashboard visualizations |

---

## Installation

```bash
# Initialize project
npx create-next-app@latest vesper --typescript --tailwind --eslint --app --src-dir

cd vesper

# Core dependencies
npm install @slack/bolt @anthropic-ai/sdk drizzle-orm postgres bullmq ioredis

# Validation & utilities
npm install zod date-fns

# UI components
npx shadcn@latest init
npx shadcn@latest add button card input table command dialog

# Dev dependencies
npm install -D drizzle-kit @types/node

# Optional: AI streaming for dashboard
npm install @vercel/ai
```

**Environment Variables:**
```env
# Slack
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
SLACK_APP_TOKEN=xapp-... # For Socket Mode

# Database
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=redis://...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not Alternative |
|----------|-------------|-------------|---------------------|
| Language | TypeScript/Node.js | Python | Team likely has JS experience; unified stack |
| Slack SDK | Bolt JS | Raw Slack API | Bolt handles OAuth, verification, events |
| LLM | Anthropic Claude | OpenAI GPT-4 | Claude better for long-context summarization, cheaper |
| ORM | Drizzle | Prisma | Drizzle is lighter, faster, no codegen |
| Database | PostgreSQL | SQLite | Need concurrency, full-text search |
| Job Queue | BullMQ | node-cron | Need persistence, retries, monitoring |
| UI Framework | Next.js | Remix, SvelteKit | Best ecosystem, shadcn/ui support |
| Components | shadcn/ui | Material UI, Chakra | Own the code, highly customizable |

---

## What NOT to Use

### Do NOT use LangChain
- **Why it seems appealing:** Popular for AI apps
- **Why to avoid:** Overkill for this use case. Direct Anthropic SDK calls are cleaner for straightforward summarization. LangChain adds abstraction without benefit here.

### Do NOT use Legacy Slack APIs
- **Why it seems appealing:** Old tutorials reference them
- **Why to avoid:** Legacy bots stopped working March 2025. Only Bolt framework is supported.

### Do NOT use SQLite
- **Why it seems appealing:** Simple, no setup
- **Why to avoid:** Multi-user dashboard + concurrent Slack scraping = write contention. PostgreSQL required for production.

### Do NOT use node-cron for critical jobs
- **Why it seems appealing:** Simple, no Redis needed
- **Why to avoid:** Jobs lost on app restart. Daily summary generation is critical - use BullMQ.

### Do NOT use Prisma
- **Why it seems appealing:** Popular, good DX
- **Why to avoid:** Larger bundle, codegen requirement, slower cold starts. Drizzle is better for this project size.

### Do NOT implement custom auth
- **Why it seems appealing:** Full control
- **Why to avoid:** For MVP, tie auth to Slack OAuth. Users install the app, they're authenticated. Dashboard can use Slack OAuth for login. No custom auth needed.

---

## Architecture Notes

### Deployment Topology

```
┌─────────────────────────────────────────────────────────────┐
│                         Vercel                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Next.js Dashboard                        │    │
│  │  - Server Components for summaries                   │    │
│  │  - API routes for data access                        │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Railway / Render                          │
│  ┌───────────────────┐    ┌───────────────────────────┐    │
│  │   Slack Bot       │    │   BullMQ Worker           │    │
│  │   (Bolt + Socket) │    │   (Daily summarization)   │    │
│  └───────────────────┘    └───────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌─────────┐    ┌─────────┐    ┌─────────────┐
        │ Postgres │    │  Redis  │    │  Anthropic  │
        │  (Neon)  │    │(Upstash)│    │    API      │
        └─────────┘    └─────────┘    └─────────────┘
```

### Why Split Deployment

1. **Dashboard on Vercel:** Optimized for Next.js, edge caching, instant deploys
2. **Bot on Railway/Render:** Long-running process (Socket Mode), BullMQ workers

---

## Sources

### Official Documentation
- [Slack Bolt for JavaScript](https://tools.slack.dev/bolt-js/)
- [Slack conversations.history API](https://docs.slack.dev/reference/methods/conversations.history/)
- [Anthropic Claude API](https://docs.anthropic.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Drizzle ORM](https://orm.drizzle.team/)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Tailwind CSS v4](https://tailwindcss.com/blog/tailwindcss-v4)
- [shadcn/ui](https://ui.shadcn.com/)

### Comparisons & Guides
- [Claude vs GPT (Zapier)](https://zapier.com/blog/claude-vs-chatgpt/)
- [Drizzle vs Prisma (Bytebase)](https://www.bytebase.com/blog/drizzle-vs-prisma/)
- [BullMQ vs node-cron (Better Stack)](https://betterstack.com/community/guides/scaling-nodejs/best-nodejs-schedulers/)
- [PostgreSQL vs SQLite (Heatware)](https://www.heatware.net/postgresql/postgres-vs-sqlite/)
- [Vercel AI SDK vs LangChain (TemplateHub)](https://www.templatehub.dev/blog/langchain-vs-vercel-ai-sdk-a-developers-ultimate-guide-2561)

### Version Verification (npm registry, 2026-01-23)
- @slack/bolt: 4.6.0
- @anthropic-ai/sdk: 0.71.2
- next: 16.1.4
- drizzle-orm: 0.45.1
- bullmq: 5.66.7
- openai: 6.16.0 (not recommended, but noted for reference)
