---
phase: 02-intelligence-query
plan: 02
subsystem: nlp
tags: [vercel-ai-sdk, openai, gpt-4o-mini, vietnamese, zod, intent-extraction]

# Dependency graph
requires:
  - phase: 01-foundation-data-pipeline
    provides: Zod already installed, project structure
provides:
  - Vietnamese text normalization (NLP-specific)
  - LLM-based intent extraction for natural language queries
  - QueryIntent schema for structured query parsing
affects: [02-03, search, query-processing]

# Tech tracking
tech-stack:
  added: [ai@6.x, @ai-sdk/openai]
  patterns: [generateObject for structured LLM output, Zod schema validation]

key-files:
  created:
    - src/services/nlp/types.ts
    - src/services/nlp/normalizer.ts
    - src/services/query/types.ts
    - src/services/query/intent.ts
  modified:
    - package.json
    - .env.example

key-decisions:
  - "gpt-4o-mini for cost-effective intent extraction (~$0.00015/query)"
  - "generateObject API for structured output with Zod schema"
  - "Separate NLP normalizer from asset normalizer for feature-rich options"

patterns-established:
  - "NormalizationOptions pattern for configurable text processing"
  - "extractIntentSafe() fallback pattern for API error handling"

# Metrics
duration: 3min
completed: 2026-01-23
---

# Phase 2 Plan 2: NLP Layer Summary

**Vietnamese text normalizer and LLM-based intent extraction using Vercel AI SDK with gpt-4o-mini for natural language query parsing**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-23T13:40:30Z
- **Completed:** 2026-01-23T13:43:52Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Installed Vercel AI SDK (ai@6.x) and OpenAI provider for LLM integration
- Created NLP-specific Vietnamese normalizer with options (preserveCase, collapseWhitespace, convertSeparators)
- Created LLM intent extraction with Zod schema validation for structured output
- System prompt handles both Vietnamese and English queries with category mapping

## Task Commits

Each task was committed atomically:

1. **Task 1: Install AI SDK dependencies** - `1869f9e` (chore)
2. **Task 2: Create Vietnamese text normalizer** - `0a590ba` (feat)
3. **Task 3: Create LLM intent extraction** - `62946a5` (feat)

## Files Created/Modified

- `src/services/nlp/types.ts` - NormalizationOptions and NormalizationResult interfaces
- `src/services/nlp/normalizer.ts` - removeDiacritics, hasDiacritics, normalizeVietnamese, normalizeWithDetails
- `src/services/query/types.ts` - QueryIntent, IntentType, AssetCategory Zod schemas
- `src/services/query/intent.ts` - extractIntent and extractIntentSafe functions
- `package.json` - Added ai and @ai-sdk/openai dependencies
- `.env.example` - Added OPENAI_API_KEY placeholder

## Decisions Made

- **gpt-4o-mini model**: Cost-effective at ~$0.00015 per query while maintaining quality for intent extraction
- **generateObject API**: Uses Zod schema for type-safe structured output instead of raw text parsing
- **Separate NLP normalizer**: Created distinct normalizer in services/nlp/ with more options than the basic asset normalizer from Phase 1

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**External services require manual configuration.** Users need to:
- Set `OPENAI_API_KEY` in `.env` (obtain from https://platform.openai.com/api-keys)

## Next Phase Readiness

- NLP layer ready for search integration (02-03)
- Intent extraction can parse "Hồ Ly mới nhất?" into structured QueryIntent
- Normalizer handles Vietnamese diacritics for consistent matching

---
*Phase: 02-intelligence-query*
*Completed: 2026-01-23*
