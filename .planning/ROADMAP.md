# Roadmap: Vesper

## Overview

Vesper delivers a Slack-integrated asset tracking system in three phases: first building the data pipeline that scrapes channels and extracts versions, then adding AI-powered search and natural language queries, and finally exposing both through a Slack bot and web dashboard. The phases build vertically - each delivers working functionality that the next phase enhances.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Foundation & Data Pipeline** - Slack integration, asset extraction, version tracking
- [x] **Phase 2: Intelligence & Query** - Search, filtering, natural language understanding
- [x] **Phase 3: User Interfaces** - Slack bot and web dashboard
- [x] **Phase 4: Gemini API Support** - Add Google Gemini as alternative LLM provider

## Phase Details

### Phase 1: Foundation & Data Pipeline
**Goal**: Raw Slack data flows into a structured asset database with version history
**Depends on**: IT approval for Slack app (external dependency - pursue in parallel)
**Requirements**: INGEST-01, INGEST-02, VERSION-01, VERSION-02
**Success Criteria** (what must be TRUE):
  1. System scrapes configured Slack channels daily and stores messages
  2. Asset versions are extracted from messages using naming convention tolerance (variations like "ho ly v3", "Ho_Ly_v3" are recognized)
  3. User can view version history per asset showing timeline with dates and authors
  4. Each asset version links back to its source Slack message
**Plans**: 5 plans in 4 waves

Plans:
- [x] 01-01-PLAN.md — Project setup (TypeScript, dependencies, Docker Compose)
- [x] 01-02-PLAN.md — Database schema with Drizzle ORM
- [x] 01-03-PLAN.md — Slack client and incremental channel scraper
- [x] 01-04-PLAN.md — Vietnamese normalizer, version parser, version tracker
- [x] 01-05-PLAN.md — BullMQ job scheduler and CLI tools

### Phase 2: Intelligence & Query
**Goal**: Users can search and query assets using natural language in Vietnamese or English
**Depends on**: Phase 1
**Requirements**: QUERY-01, QUERY-02, QUERY-03, QUERY-04
**Success Criteria** (what must be TRUE):
  1. User can search assets by name with exact and fuzzy matching
  2. User can filter assets by category (Sound, 3D, 2D, Animation, UI, Story)
  3. User can ask natural language queries like "Ho ly moi nhat?" and get correct results
  4. System understands Vietnamese asset names and queries
**Plans**: 3 plans in 2 waves

Plans:
- [x] 02-01-PLAN.md — Database search layer (pg_trgm extension, fuzzy search service)
- [x] 02-02-PLAN.md — NLP layer (Vietnamese normalizer, LLM intent extraction)
- [x] 02-03-PLAN.md — Query executor (intent dispatch, asset repository, integration)

### Phase 3: User Interfaces
**Goal**: Team members access asset tracking via Slack bot and web dashboard
**Depends on**: Phase 2
**Requirements**: UI-01, UI-02
**Success Criteria** (what must be TRUE):
  1. Slack bot responds to queries in Slack with asset version information
  2. Web dashboard displays asset versions, history, and search interface
  3. Both interfaces return consistent results (same data layer)
**Plans**: 4 plans in 3 waves

Plans:
- [x] 03-01-PLAN.md — Shared query service and Hono API layer
- [x] 03-02-PLAN.md — Slack bot (slash commands, app mentions, Block Kit responses)
- [x] 03-03-PLAN.md — Web dashboard (Next.js with shadcn/ui)
- [x] 03-04-PLAN.md — Integration testing (cross-interface consistency verification)

### Phase 4: Gemini API Support
**Goal**: Support Google Gemini as an alternative LLM provider for intent extraction
**Depends on**: Phase 2
**Requirements**: LLM-01
**Success Criteria** (what must be TRUE):
  1. System can use Gemini API for natural language intent extraction
  2. Users can configure LLM provider via environment variable (GOOGLE_GENERATIVE_AI_API_KEY)
  3. Fallback behavior when primary LLM unavailable
  4. Consistent query results regardless of LLM provider
**Plans**: 2 plans in 2 waves

Plans:
- [x] 04-01-PLAN.md — LLM provider infrastructure (provider factory, fallback, env config)
- [x] 04-02-PLAN.md — Intent extraction integration and provider testing

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Data Pipeline | 5/5 | Complete | 2026-01-23 |
| 2. Intelligence & Query | 3/3 | Complete | 2026-01-23 |
| 3. User Interfaces | 4/4 | Complete | 2026-01-23 |
| 4. Gemini API Support | 2/2 | Complete | 2026-01-23 |

## Dependencies

**External:**
- IT approval for Slack app with required scopes (channels:history, channels:read, chat:write, commands)
- Must be obtained before Phase 1 can complete Slack integration
- Recommended: Start IT approval process immediately in parallel with development setup
- OpenAI API key for Phase 2 LLM intent extraction (OPENAI_API_KEY)
- Google Gemini API key for Phase 4 alternative LLM provider (GOOGLE_GENERATIVE_AI_API_KEY)

**Internal:**
- Phase 2 requires Phase 1 (need data before queries)
- Phase 3 requires Phase 2 (need query layer before interfaces)
- Phase 4 requires Phase 2 (extends LLM layer)

---
*Roadmap created: 2026-01-23*
*Last updated: 2026-01-23 — Completed 04-02-PLAN.md (Phase 4 complete, all phases done)*
