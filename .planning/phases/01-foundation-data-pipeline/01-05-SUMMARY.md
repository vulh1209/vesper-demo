---
phase: 01-foundation-data-pipeline
plan: 05
subsystem: jobs
tags: [bullmq, redis, cli, scheduler, cron]

# Dependency graph
requires:
  - phase: 01-03
    provides: Slack scraper (scrapeChannel)
  - phase: 01-04
    provides: Asset parser (extractAllVersions), version tracker (createOrUpdateVersion)
provides:
  - BullMQ job queue for scrape jobs
  - Worker that processes scrape jobs
  - Daily scheduler with cron pattern
  - CLI for manual scraping
  - CLI for viewing version history
affects: [phase-2-ai, phase-2-bot, phase-3-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "BullMQ Job Schedulers API (upsertJobScheduler)"
    - "Exponential backoff for retries"
    - "Graceful shutdown on SIGTERM"

key-files:
  created:
    - src/jobs/queue.ts
    - src/jobs/worker.ts
    - src/jobs/daily-scrape.ts
    - src/cli/scrape.ts
    - src/cli/history.ts
  modified:
    - package.json

key-decisions:
  - "BullMQ Job Schedulers API for cron (not old repeatable API)"
  - "Concurrency 1 for rate limit safety"
  - "Exponential backoff: 3 attempts, starting 1 minute"

patterns-established:
  - "Worker pattern: process one job at a time to respect rate limits"
  - "CLI pattern: parseArgs with --help, positional args, exit codes"

# Metrics
duration: 8min
completed: 2026-01-23
---

# Phase 1 Plan 05: Job Queue & CLI Summary

**BullMQ job queue with daily scheduler and CLI tools for scraping channels and viewing asset history**

## Performance

- **Duration:** 8 min
- **Started:** 2026-01-23T13:30:00Z
- **Completed:** 2026-01-23T13:38:00Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- BullMQ queue with exponential backoff retry policy
- Worker that scrapes channels and extracts versions
- Daily scheduler using modern Job Schedulers API
- CLI tools for manual operations

## Task Commits

Each task was committed atomically:

1. **Task 1: Create BullMQ queue and worker** - `5375969` (feat)
2. **Task 2: Create daily scheduler** - `e2c9edd` (feat)
3. **Task 3: Create CLI tools** - `b3eeaf5` (feat)

## Files Created/Modified

- `src/jobs/queue.ts` - BullMQ queue configuration with Redis connection
- `src/jobs/worker.ts` - Job processor that scrapes channels and extracts versions
- `src/jobs/daily-scrape.ts` - Daily scheduler with upsertJobScheduler
- `src/cli/scrape.ts` - CLI for manual channel scraping
- `src/cli/history.ts` - CLI for viewing asset version history
- `package.json` - Added scripts: worker, scheduler, cli:scrape, cli:history

## Decisions Made

- **BullMQ Job Schedulers API** - Used upsertJobScheduler instead of old repeatable jobs API for better reliability
- **Concurrency 1** - Process one job at a time to respect Slack rate limits
- **Exponential backoff** - 3 retry attempts starting at 1 minute delay

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **import.meta.url not available in CommonJS** - Changed to require.main === module pattern

## User Setup Required

None - no external service configuration required (Redis is in docker-compose from 01-01).

## Next Phase Readiness

- Job queue ready for daily automated scraping
- CLI tools enable testing without running full worker
- Ready for Phase 2: AI summarization and Slack bot

---
*Phase: 01-foundation-data-pipeline*
*Completed: 2026-01-23*
