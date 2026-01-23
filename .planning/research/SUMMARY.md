# Project Research Summary

**Project:** Vesper - Slack Asset Tracker
**Domain:** Slack-integrated asset version tracking with AI summarization for game development
**Researched:** 2026-01-23
**Confidence:** HIGH

## Executive Summary

Vesper is a Slack-native asset tracking tool for game development teams. The research reveals a well-defined technical path: **Node.js/TypeScript with Bolt SDK for Slack, Claude API for AI summarization, PostgreSQL with Drizzle ORM for persistence, and Next.js for the dashboard**. This stack is mature, well-documented, and the team likely has JavaScript expertise. The critical insight is that daily batch processing (not real-time) is the right architecture - it simplifies rate limit handling, reduces complexity, and matches the actual use case where 24-hour freshness is acceptable.

The primary risks center on **Slack API rate limits** and **AI summarization accuracy**. Non-Marketplace Slack apps face severe rate limits (1 request/minute for `conversations.history`), which can cripple daily scraping jobs. AI summarization has a documented 45% error rate for factual claims, which is catastrophic for a tool whose value proposition is "accurate version tracking." Both risks have clear mitigations: verify app classification with Slack before development, and use a hybrid extraction approach (regex for version numbers, AI for context).

The feature research shows a gap in the market between enterprise knowledge bots (general purpose, not asset-aware) and game dev DAM tools (powerful but not Slack-native). Vesper's differentiation is being **Slack-native + asset-aware + game dev specific**. MVP should include natural language queries, version history, source attribution, and daily summaries. Asset previews in Slack would be a strong differentiator. The dashboard should be deferred until the Slack bot proves value.

## Key Findings

### Recommended Stack

A unified TypeScript/Node.js stack enables code sharing between the Slack bot and web dashboard. The combination of Bolt SDK, Drizzle ORM, and BullMQ provides production-grade tooling with minimal boilerplate.

**Core technologies:**
- **@slack/bolt 4.6.0**: Official Slack framework with built-in OAuth, rate limiting, and Socket Mode for development
- **@anthropic-ai/sdk**: Claude Sonnet 4 for summarization - better long-context handling and cheaper than GPT-4
- **Next.js 16+ with App Router**: Server Components for fast initial load, built-in API routes
- **PostgreSQL + Drizzle ORM**: Type-safe database access without codegen, excellent serverless support
- **BullMQ + Redis**: Persistent job queue for daily batch processing - jobs survive restarts

**Do NOT use:**
- LangChain (overkill for straightforward summarization)
- Legacy Slack APIs (deprecated since March 2025)
- SQLite (write contention with concurrent access)
- node-cron (jobs lost on restart)
- Custom auth (use Slack OAuth)

### Expected Features

**Must have (table stakes):**
- Natural language queries ("latest Ho Ly?") - Slack AI has raised baseline expectations
- Version history per asset - core value proposition
- Source attribution with links to original Slack messages - 94% of users expect this
- Multi-channel scraping - teams use multiple channels
- Daily summaries - information overload is the problem being solved
- Search by asset name and category - basic discoverability

**Should have (competitive advantage):**
- Asset preview in Slack (thumbnails inline) - huge UX win, visual credibility
- Vietnamese language understanding - differentiator for Vietnamese studios
- Naming convention tolerance - handle variations like "ho_ly_v3", "Ho Ly Version 3"

**Defer (v2+):**
- Web dashboard - Slack bot must prove value first
- Cross-asset dependency tracking - high complexity, needs usage data
- "What changed?" visual comparison - needs solid version history foundation
- Context-aware follow-ups - single-shot queries work for MVP

**Anti-features (never build):**
- File storage/hosting - competing with DAM tools is a losing battle
- Approval workflows - turns into project management tool
- Real-time sync - batch processing is simpler and sufficient

### Architecture Approach

The architecture follows a monorepo pattern with shared packages for business logic. Daily batch processing (6 AM cron) scrapes Slack channels, extracts asset versions, and generates AI summaries. Both the Slack bot and web dashboard consume the same Query Service, ensuring consistent behavior. The database uses a hybrid schema: structured columns for indexed queries, JSONB for preserving full Slack payloads.

**Major components:**
1. **Slack Bot (Bolt SDK)** - Handle user queries, parse intent, return formatted responses
2. **Scheduled Processor (BullMQ)** - Daily scrape, asset extraction, AI summarization
3. **Next.js Web App** - Dashboard UI and API routes
4. **Shared Services (packages/core)** - Slack, AI, Asset, and Query services

**Deployment topology:**
- Dashboard on Vercel (optimized for Next.js)
- Bot + workers on Railway/Render (long-running processes)
- PostgreSQL on Neon, Redis on Upstash

### Critical Pitfalls

1. **Rate Limit Strangulation** - Non-Marketplace apps limited to 1 req/min for `conversations.history`. **Avoid:** Verify app classification as "Custom App" before development, design for worst-case limits, use incremental sync with `oldest` parameter.

2. **AI Hallucination (45% error rate)** - LLMs hallucinate version numbers because they're arbitrary strings. **Avoid:** Extract versions with regex FIRST, then summarize with AI. Always cite source messages.

3. **IT Approval Stall** - Each new scope triggers review. **Avoid:** Request ALL needed scopes upfront with business justification before writing any code.

4. **Pagination Data Loss** - Checking result count instead of `next_cursor` silently loses data. **Avoid:** ONLY check `next_cursor` for completion, dedupe by message `ts`.

5. **Token Rotation Trap** - Once enabled, cannot be disabled. Tokens expire every 12 hours. **Avoid:** Decide rotation stance before OAuth implementation, use Bolt which handles it automatically.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 0: IT Approval & Slack Setup
**Rationale:** IT approval is a common blocker that can take weeks. Start this before any development.
**Delivers:** Approved Slack app with all needed scopes, verified app classification
**Addresses:** IT approval stall pitfall
**Avoids:** Scope creep rejection (request all scopes upfront)

### Phase 1: Foundation & Slack Integration
**Rationale:** All other components depend on the database schema and Slack data ingestion
**Delivers:** Database schema, Slack message fetching, raw message storage
**Uses:** PostgreSQL + Drizzle ORM, @slack/bolt
**Avoids:** Rate limit strangulation, pagination data loss, token rotation trap

### Phase 2: Asset Extraction Pipeline
**Rationale:** Must parse and structure data before AI summarization can work
**Delivers:** Asset version extraction, naming convention tolerance, version history
**Implements:** Asset Service, hybrid regex + pattern matching
**Addresses:** Search by name/category features

### Phase 3: AI Summarization
**Rationale:** Requires extracted asset data to summarize; must be built carefully to avoid hallucination
**Delivers:** Daily AI summaries, natural language query parsing
**Uses:** Claude Sonnet 4 via @anthropic-ai/sdk
**Avoids:** AI hallucination (extract-then-summarize pattern)

### Phase 4: Slack Bot Interface
**Rationale:** Core user interface; can only be built after data pipeline and AI services exist
**Delivers:** Natural language queries, version history responses, source attribution
**Addresses:** Table stakes features (NL queries, attribution)
**Avoids:** NL query scope creep (constrain initial scope)

### Phase 5: Web Dashboard
**Rationale:** Defer until Slack bot proves value; same data layer ensures consistency
**Delivers:** Dashboard UI, search/browse, visual timeline
**Implements:** Next.js App Router, shadcn/ui
**Avoids:** Dashboard-Slack desync (single data store)

### Phase Ordering Rationale

- **IT approval must start first** - It's a blocking dependency that runs in parallel with early development
- **Foundation before features** - Database schema and Slack integration are prerequisites for everything
- **Extraction before AI** - Hybrid regex extraction prevents AI hallucination by providing verified data
- **Bot before dashboard** - Slack bot is the primary interface; dashboard is "nice to have" for MVP
- **Single data pipeline** - Prevents dashboard-Slack desync by design

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (Slack Integration):** Verify current rate limits for your app classification, test pagination edge cases
- **Phase 3 (AI Summarization):** Test Claude's accuracy on actual Slack message formats from the team

Phases with standard patterns (skip research-phase):
- **Phase 5 (Dashboard):** Next.js + shadcn/ui is well-documented, established patterns

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Official docs, verified versions, clear comparisons |
| Features | MEDIUM | Synthesized from multiple sources, no direct competitor teardowns |
| Architecture | HIGH | Standard patterns, official Slack recommendations |
| Pitfalls | HIGH | Verified via official Slack docs and research studies |

**Overall confidence:** HIGH

### Gaps to Address

- **Actual rate limits for this specific app:** Need to verify app classification with Slack after creation
- **Team's naming conventions:** Asset extraction patterns depend on how the team actually names assets
- **Channel volume:** Need real data on messages/day to validate batch processing assumptions
- **Vietnamese language handling:** May need additional testing with actual Vietnamese asset names

## Sources

### Primary (HIGH confidence)
- [Slack Bolt Documentation](https://tools.slack.dev/bolt-js/) - Bot framework guidance
- [Slack Rate Limits](https://docs.slack.dev/apis/web-api/rate-limits/) - Rate limit details
- [Slack Pagination](https://docs.slack.dev/apis/web-api/pagination/) - Cursor-based pagination
- [Anthropic API Documentation](https://docs.anthropic.com/) - Claude integration
- [Drizzle ORM Documentation](https://orm.drizzle.team/) - Database ORM
- [BullMQ Documentation](https://docs.bullmq.io/) - Job queue

### Secondary (MEDIUM confidence)
- [EBU AI Summarization Study](https://www.tvtechnology.com/news/major-study-finds-high-levels-of-mistakes-in-ai-generated-news-summaries) - 45% error rate finding
- [GDELT LLM Entity Extraction](https://blog.gdeltproject.org/experiments-in-entity-extraction-using-llms-hallucination-how-a-single-apostrophe-can-change-the-results/) - Entity extraction brittleness
- [Slack AI Features Guide](https://slack.com/help/articles/25076892548883-Guide-to-AI-features-in-Slack) - Baseline feature expectations

### Tertiary (LOW confidence)
- [DAM 2026 Trends - Real Story Group](https://www.realstorygroup.com/Blog/webinar-dam-2026-six-trends-watch-ai-driven-world) - Market positioning

---
*Research completed: 2026-01-23*
*Ready for roadmap: yes*
