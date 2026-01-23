# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vesper is a Slack-integrated asset version tracking system for game development teams. It scrapes Slack channels for asset updates, uses AI to extract version information, and provides both a Slack bot (natural language queries) and REST API for the web dashboard.

**Core workflow:** Slack messages → Version extraction → PostgreSQL → Search (bot/API/dashboard)

## Common Commands

```bash
# Development
npm run dev              # Run main app with hot reload (tsx watch)
npm run api              # Start Hono API server (port 3001)
npm run bot              # Start Slack bot
npm run worker           # Start BullMQ worker for scrape jobs
npm run scheduler        # Run daily scrape scheduler

# Database (Drizzle ORM)
npm run db:generate      # Generate migrations from schema changes
npm run db:push          # Push schema directly (dev only)
npm run db:migrate       # Run migrations
npm run db:studio        # Open Drizzle Studio GUI
npm run db:verify        # Verify database connection

# Testing
npm run test             # Run all tests with vitest
npm run test:watch       # Run tests in watch mode
npm run test:integration # Run integration tests only

# CLI Tools
npm run cli:scrape       # Manual scrape trigger
npm run cli:history      # View scrape history
npm run test:query       # Test query execution
```

## Architecture

### Data Flow
1. **Slack Scraper** ([src/services/slack/scraper.ts](src/services/slack/scraper.ts)) - Paginated channel history fetch with rate limiting
2. **Asset Parser** ([src/services/asset/parser.ts](src/services/asset/parser.ts)) - Regex-based version extraction (e.g., "Ho Ly v3" → asset: "ho ly", version: "3")
3. **Version Tracker** ([src/services/version/tracker.ts](src/services/version/tracker.ts)) - Upsert versions, maintain latest_version denormalization
4. **Search Service** ([src/services/search/](src/services/search/)) - PostgreSQL trigram similarity + exact matching

### Query Pipeline (Natural Language)
1. **Intent Extraction** ([src/services/query/intent.ts](src/services/query/intent.ts)) - LLM parses Vietnamese/English queries into structured intent
2. **Query Executor** ([src/services/query/executor.ts](src/services/query/executor.ts)) - Routes intent to appropriate search/list operation
3. **Response formatting** - Bot views or API JSON

### Key Services
- **LLM Config** ([src/config/llm.ts](src/config/llm.ts)) - Gemini primary (cheaper), OpenAI fallback, auto-detection from env vars
- **BullMQ Jobs** ([src/jobs/](src/jobs/)) - Background scrape processing with Redis queue
- **Hono API** ([src/api/](src/api/)) - REST endpoints for dashboard
- **Slack Bot** ([src/bot/](src/bot/)) - Bolt framework, socket mode

### Database Schema ([src/db/schema.ts](src/db/schema.ts))
- `channels` - Tracked Slack channels with sync state
- `assets` - Unique assets with denormalized `latest_version`
- `asset_versions` - Version history per asset (links to Slack messages)
- `slack_messages` - Raw message storage for reprocessing

## Key Patterns

### Vietnamese Text Handling
- All asset names normalized: remove diacritics, lowercase, spaces (e.g., "Hồ Ly" → "ho ly")
- Normalizer at [src/services/nlp/normalizer.ts](src/services/nlp/normalizer.ts)

### Slack Timestamps
- **Always store as strings** - float precision issues with numbers
- Use `oldest` param for incremental fetch, `next_cursor` for pagination (never count)

### Version Extraction Patterns (priority order)
1. `v-prefix`: "Ho Ly v3"
2. `version-word`: "Ho Ly Version 3"
3. `underscore-v`: "character_rig_v14_final"
4. `hash-version`: "asset #3"
5. `parentheses`: "asset (v3)"

### Asset Categories
Fixed set: `sound`, `3d`, `2d`, `animation`, `ui`, `story`

## Environment Variables

Required in `.env` (see `.env.example`):
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis for BullMQ
- `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET` - Slack app credentials
- `SLACK_APP_TOKEN` - For socket mode
- At least one LLM key: `OPENAI_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY`
- Optional `LLM_PROVIDER=openai|gemini` to force provider
