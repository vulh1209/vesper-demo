# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-23)

**Core value:** Reduce miscommunication - everyone on the team always knows and uses the correct/latest version of assets
**Current focus:** Phase 5 - Admin Dashboard (In progress)

## Current Position

Phase: 5 of 5 (Admin Dashboard)
Plan: 2 of 3 in current phase
Status: In progress
Last activity: 2026-01-24 - Completed 05-02-PLAN.md

Progress: [████████████████░] 94% (16/17 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 16
- Average duration: 4 min
- Total execution time: 1.07 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-data-pipeline | 5 | 23min | 5min |
| 02-intelligence-query | 3 | 7min | 2.3min |
| 03-user-interfaces | 4 | 20min | 5min |
| 04-gemini-api-support | 2 | 6min | 3min |
| 05-admin-dashboard | 2 | 8min | 4min |

**Recent Trend:**
- Last 5 plans: 03-04 (11min), 04-01 (3min), 04-02 (3min), 05-01 (5min), 05-02 (3min)
- Trend: Consistent

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- **NodeNext module resolution** - Better ESM/CJS interop (01-01)
- **Docker Compose v2 format** - No version attribute, modern syntax (01-01)
- **Slack timestamps as TEXT** - Avoid float precision loss in database storage (01-02)
- **Composite unique index** - (channel, ts, asset_id) prevents duplicate versions (01-02)
- **Slack ts as string** - Avoid float precision loss with timestamps (01-03)
- **Cursor-only pagination** - Never check result count for Slack API (01-03)
- **Store rawName + normalizedName** - Raw for display, normalized for matching (01-04)
- **Unicode property escapes** - \p{L} for Vietnamese regex support (01-04)
- **Duplicate via constraint** - Let Postgres 23505 error handle duplicates (01-04)
- **BullMQ Job Schedulers API** - upsertJobScheduler for reliable cron scheduling (01-05)
- **Worker concurrency 1** - Respect Slack rate limits (01-05)
- **Exponential backoff** - 3 attempts, starting 1 minute delay (01-05)
- **pg_trgm over PGroonga** - Simpler, sufficient for asset name matching (02-01)
- **Exact match first pattern** - Try btree before fuzzy for 10x speed (02-01)
- **minSimilarity 0.3 default** - Balances recall vs precision (02-01)
- **gpt-4o-mini for intent** - Cost-effective at ~$0.00015/query (02-02)
- **generateObject API** - Zod schema for structured LLM output (02-02)
- **Fallback fuzzy search** - Suggest alternatives when exact match fails (02-03)
- **Intent-dispatch pattern** - Switch on intent type to route queries (02-03)
- **Hono over Express** - Lightweight, TypeScript-native, edge-compatible (03-01)
- **zValidator middleware** - Type-safe query param validation with Zod (03-01)
- **Wrap existing search** - HTTP API uses Phase 2 infrastructure directly (03-01)
- **Block Kit views in separate module** - Enables reuse across bot commands/events (03-02)
- **findAssetByName + getAssetDetail pattern** - Basic lookup then full details for version history (03-02)
- **Inter font with vietnamese subset** - Ensures proper rendering of Vietnamese asset names (03-03)
- **Debounce 300ms** - Prevents excessive API calls while maintaining responsive feel (03-03)
- **API client abstraction** - Centralized fetch logic in lib/api.ts (03-03)
- **vitest over Jest** - Modern ESM support, faster execution (03-04)
- **normalizeForComparison helper** - Date normalization for cross-interface testing (03-04)
- **Gemini primary when both configured** - 3x cheaper than gpt-4o-mini (04-01)
- **gemini-2.0-flash model** - Not 2.5, which is 3x more expensive (04-01)
- **Provider factory pattern** - getLLMConfig() for single, getModelWithFallback() for resilience (04-01)
- **Graceful LLM degradation** - Fallback to 'search' intent when LLM unavailable (04-02)
- **409 Conflict for channel delete with messages** - Prevents accidental data loss (05-01)
- **Slack channel ID regex validation** - C prefix + alphanumeric format (05-01)
- **Admin routes under /api/admin/* namespace** - Clear separation from public API (05-01)
- **Server actions for mutations** - Cleaner than client-side fetch with revalidation (05-02)
- **AlertDialog for remove confirmation** - Prevents accidental channel deletions (05-02)

### Pending Todos

None yet.

### Roadmap Evolution

- Phase 4 added: Gemini API Support (2026-01-23)
- Phase 6 added: Support Chat DM with Bot (2026-01-24)

### Blockers/Concerns

- **IT Approval**: Slack app requires IT approval before Phase 1 Slack integration. Start this process immediately.

## Session Continuity

Last session: 2026-01-24T07:02:23Z
Stopped at: Completed 05-02-PLAN.md
Resume file: None

---
*Next step: Execute 05-03-PLAN.md (Scrape history and logs)*
