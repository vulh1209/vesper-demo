# Phase 2: Intelligence & Query - Research

**Researched:** 2026-01-23
**Domain:** Search, filtering, natural language query understanding for Vietnamese/English
**Confidence:** HIGH

## Summary

Phase 2 builds the intelligence layer that enables users to search and query assets using natural language. The critical challenges are: (1) fuzzy matching that handles Vietnamese diacritics and naming variations, (2) natural language understanding for queries like "Ho ly moi nhat?", and (3) category filtering across 6 asset types.

The recommended approach uses a **hybrid architecture**: PostgreSQL pg_trgm for fuzzy text search at the database level, Fuse.js (already in Phase 1 stack) for in-memory fuzzy matching of asset names, and LLM-based intent extraction using the Vercel AI SDK with OpenAI for natural language query understanding. This avoids hand-rolling NLP while leveraging existing infrastructure.

**Primary recommendation:** Use LLM function calling (via Vercel AI SDK) for intent extraction rather than traditional NLP libraries. For Vietnamese queries, normalize text before search and let the LLM handle language understanding. PostgreSQL pg_trgm provides the database-level fuzzy search foundation.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ai (Vercel AI SDK) | 6.x | LLM integration for intent extraction | Unified API, TypeScript-first, structured output support |
| @ai-sdk/openai | latest | OpenAI provider for AI SDK | Official provider, supports gpt-4o-mini |
| pg_trgm | built-in | PostgreSQL fuzzy text search | Native extension, GIN index support, proven at scale |
| fuse.js | 7.1.0 | Client-side fuzzy matching | Already in stack (Phase 1), zero dependencies |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | 4.3.6 | Schema validation for LLM output | Already in stack, required by AI SDK |
| normalize-text | 3.x | Diacritics/accent normalization | Vietnamese text preprocessing |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| AI SDK + OpenAI | node-nlp | node-nlp requires training data, no native Vietnamese; OpenAI handles Vietnamese out of box |
| pg_trgm | PGroonga | PGroonga is more powerful but requires extension installation; pg_trgm is simpler and sufficient |
| AI SDK | Direct OpenAI SDK | AI SDK provides unified interface, easier to swap models, better TypeScript support |
| gpt-4o-mini | gpt-4o | gpt-4o-mini is 10x cheaper, sufficient for intent extraction |

**Installation:**
```bash
npm install ai @ai-sdk/openai normalize-text
```

**Note:** fuse.js and zod already installed from Phase 1.

## Architecture Patterns

### Recommended Project Structure

```
src/
├── services/
│   ├── search/
│   │   ├── fuzzy.ts           # Fuse.js fuzzy matching
│   │   ├── database.ts        # PostgreSQL pg_trgm queries
│   │   └── index.ts           # Search orchestration
│   ├── query/
│   │   ├── intent.ts          # LLM intent extraction
│   │   ├── executor.ts        # Query execution based on intent
│   │   └── types.ts           # Intent types
│   └── nlp/
│       ├── normalizer.ts      # Vietnamese text normalization
│       └── types.ts           # NLP types
├── db/
│   └── migrations/
│       └── 0002_add_trigram.ts  # pg_trgm extension setup
└── config/
    └── search.ts              # Search configuration
```

### Pattern 1: LLM Intent Extraction with Structured Output

**What:** Use LLM to parse natural language queries into structured intents, then execute against database.

**When to use:** Every natural language query like "Ho ly moi nhat?" or "Show me latest sounds."

**Example:**
```typescript
// src/services/query/intent.ts
import { generateText, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

// Define intent schema
const QueryIntentSchema = z.object({
  intent: z.enum(['search', 'latest', 'list_category', 'version_history', 'unknown'])
    .describe('The type of query the user is making'),
  assetName: z.string().nullable()
    .describe('The asset name being searched for, normalized without diacritics'),
  category: z.enum(['sound', '3d', '2d', 'animation', 'ui', 'story']).nullable()
    .describe('The asset category filter'),
  limit: z.number().nullable()
    .describe('Number of results to return, default 10'),
});

type QueryIntent = z.infer<typeof QueryIntentSchema>;

export async function extractIntent(userQuery: string): Promise<QueryIntent> {
  const today = new Date().toISOString().split('T')[0];

  const { output } = await generateText({
    model: openai('gpt-4o-mini'),
    output: Output.object({
      schema: QueryIntentSchema,
    }),
    system: `You are a query parser for an asset tracking system.
Parse the user's query (Vietnamese or English) into structured intent.

Asset categories: sound, 3d, 2d, animation, ui, story
Common queries:
- "Ho ly moi nhat?" = latest version of asset "ho ly"
- "Show me all sounds" = list category "sound"
- "Lich su boss theme" = version history of "boss theme"

Normalize Vietnamese: remove diacritics (Ho Ly, not Ho Ly).
Today is ${today}.`,
    prompt: userQuery,
  });

  return output;
}

// Usage
const intent = await extractIntent('Ho ly moi nhat?');
// { intent: 'latest', assetName: 'ho ly', category: null, limit: 1 }
```

### Pattern 2: PostgreSQL pg_trgm Fuzzy Search

**What:** Use trigram matching at database level for fuzzy text search with GIN index.

**When to use:** For searching asset names with typo tolerance and partial matches.

**Example:**
```typescript
// src/services/search/database.ts
import { sql } from 'drizzle-orm';
import { db } from '../../db/client';
import { assets } from '../../db/schema';

// Enable pg_trgm extension (run once in migration)
// CREATE EXTENSION IF NOT EXISTS pg_trgm;
// CREATE INDEX idx_assets_name_trgm ON assets USING gin (normalized_name gin_trgm_ops);

export async function fuzzySearchAssets(
  searchTerm: string,
  options: { limit?: number; minSimilarity?: number } = {}
) {
  const { limit = 10, minSimilarity = 0.3 } = options;

  // Normalize search term
  const normalized = normalizeVietnamese(searchTerm);

  const results = await db
    .select({
      id: assets.id,
      rawName: assets.rawName,
      normalizedName: assets.normalizedName,
      category: assets.category,
      latestVersion: assets.latestVersion,
      similarity: sql<number>`similarity(${assets.normalizedName}, ${normalized})`,
    })
    .from(assets)
    .where(sql`similarity(${assets.normalizedName}, ${normalized}) > ${minSimilarity}`)
    .orderBy(sql`similarity(${assets.normalizedName}, ${normalized}) DESC`)
    .limit(limit);

  return results;
}

// Exact + fuzzy combined (try exact first for performance)
export async function searchAssets(searchTerm: string) {
  // Try exact match first
  const normalized = normalizeVietnamese(searchTerm);

  const exactMatch = await db
    .select()
    .from(assets)
    .where(sql`${assets.normalizedName} = ${normalized}`)
    .limit(1);

  if (exactMatch.length > 0) {
    return { type: 'exact', results: exactMatch };
  }

  // Fall back to fuzzy
  const fuzzyResults = await fuzzySearchAssets(searchTerm);
  return { type: 'fuzzy', results: fuzzyResults };
}
```

### Pattern 3: Vietnamese Text Normalization

**What:** Normalize Vietnamese text by removing diacritics for consistent matching.

**When to use:** Before storing normalized names and before searching.

**Example:**
```typescript
// src/services/nlp/normalizer.ts

// Simple Vietnamese normalization (no dependencies)
const DIACRITIC_MAP: Record<string, string> = {
  'à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ': 'a',
  'è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ': 'e',
  'ì|í|ị|ỉ|ĩ': 'i',
  'ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ': 'o',
  'ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ': 'u',
  'ỳ|ý|ỵ|ỷ|ỹ': 'y',
  'đ': 'd',
};

export function normalizeVietnamese(text: string): string {
  let normalized = text.toLowerCase().trim();

  for (const [pattern, replacement] of Object.entries(DIACRITIC_MAP)) {
    normalized = normalized.replace(new RegExp(pattern, 'g'), replacement);
  }

  // Normalize whitespace and separators
  normalized = normalized.replace(/[_\-]+/g, ' ');
  normalized = normalized.replace(/\s+/g, ' ');

  return normalized;
}

// Alternative: Using normalize-text package for robustness
import { normalizeText } from 'normalize-text';

export function normalizeVietnameseAlt(text: string): string {
  return normalizeText(text.toLowerCase().trim());
}
```

### Pattern 4: Query Execution Pipeline

**What:** Orchestrate intent extraction -> query execution -> result formatting.

**When to use:** Entry point for all natural language queries.

**Example:**
```typescript
// src/services/query/executor.ts
import { extractIntent } from './intent';
import { searchAssets, fuzzySearchAssets } from '../search/database';
import { getLatestVersion, getVersionHistory } from '../version/tracker';
import { listByCategory } from '../asset/repository';

export interface QueryResult {
  type: 'assets' | 'versions' | 'error';
  data: any[];
  message: string;
}

export async function executeQuery(userQuery: string): Promise<QueryResult> {
  // 1. Extract intent
  const intent = await extractIntent(userQuery);

  // 2. Execute based on intent
  switch (intent.intent) {
    case 'search':
      if (!intent.assetName) {
        return { type: 'error', data: [], message: 'Please specify an asset name' };
      }
      const searchResults = await searchAssets(intent.assetName);
      return {
        type: 'assets',
        data: searchResults.results,
        message: `Found ${searchResults.results.length} assets matching "${intent.assetName}"`,
      };

    case 'latest':
      if (!intent.assetName) {
        return { type: 'error', data: [], message: 'Please specify an asset name' };
      }
      const latest = await getLatestVersion(intent.assetName, intent.category);
      return {
        type: 'versions',
        data: latest ? [latest] : [],
        message: latest
          ? `Latest version of ${intent.assetName}: v${latest.version}`
          : `No asset found matching "${intent.assetName}"`,
      };

    case 'list_category':
      if (!intent.category) {
        return { type: 'error', data: [], message: 'Please specify a category' };
      }
      const categoryResults = await listByCategory(intent.category, intent.limit ?? 10);
      return {
        type: 'assets',
        data: categoryResults,
        message: `${categoryResults.length} assets in ${intent.category} category`,
      };

    case 'version_history':
      if (!intent.assetName) {
        return { type: 'error', data: [], message: 'Please specify an asset name' };
      }
      const history = await getVersionHistory(intent.assetName);
      return {
        type: 'versions',
        data: history,
        message: `Version history for ${intent.assetName}`,
      };

    default:
      return {
        type: 'error',
        data: [],
        message: "I didn't understand that query. Try: 'Ho ly moi nhat?' or 'Show me all sounds'",
      };
  }
}
```

### Anti-Patterns to Avoid

- **Training NLP models for small datasets:** Use LLM zero-shot instead. Traditional NLP (node-nlp, NLTK) requires training data and doesn't understand Vietnamese well out of box.
- **Raw LLM output without schema:** Always use structured output (Zod schema) to ensure predictable results.
- **Searching without normalization:** Always normalize Vietnamese text before comparison.
- **Fuzzy search on every query:** Try exact match first, fall back to fuzzy - 10x faster.
- **Multiple LLM calls per query:** Extract all intent in single call with comprehensive schema.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Natural language intent extraction | Regex patterns, keyword matching | LLM structured output | Vietnamese is complex, edge cases multiply |
| Fuzzy text matching in DB | LIKE with wildcards | pg_trgm | LIKE doesn't handle typos, pg_trgm is indexed |
| Vietnamese normalization | Character-by-character mapping | normalize-text or proven gist | Diacritic combinations are complex |
| Similarity ranking | Custom scoring | pg_trgm similarity() | Proven trigram algorithm |
| LLM integration | Direct API calls | Vercel AI SDK | Handles retries, streaming, schema validation |

**Key insight:** LLM function calling has replaced traditional NLP for intent extraction in 2025. It's more flexible, handles multilingual queries, and requires zero training data. The tradeoff is cost (~$0.00015 per query with gpt-4o-mini) - acceptable for this use case.

## Common Pitfalls

### Pitfall 1: Vietnamese Diacritics Breaking Search

**What goes wrong:** User searches "Ho Ly" but asset stored as "Ho Ly" doesn't match because normalization is inconsistent.

**Why it happens:** Vietnamese has multiple diacritic marks. If normalization isn't applied consistently on both storage and query, matches fail.

**How to avoid:**
1. Normalize at write time (store both raw and normalized names)
2. Normalize at query time before search
3. Use same normalization function everywhere
4. Test with diacritics variations: Ho Ly, ho ly, Ho_Ly, ho-ly

**Warning signs:** Exact-named assets not found, duplicate assets with slight variations

### Pitfall 2: LLM Hallucinating Asset Names

**What goes wrong:** LLM returns an asset name that doesn't exist because it "imagines" what user meant.

**Why it happens:** LLM is generative - it can create plausible-sounding names.

**How to avoid:**
1. Don't ask LLM to guess asset names - extract what user said
2. Use fuzzy matching on database to find closest real asset
3. Return "no match found" rather than LLM-invented names
4. Schema should have `assetName` as extracted text, not LLM interpretation

**Warning signs:** Queries returning empty results for assets that exist

### Pitfall 3: Slow pg_trgm Queries Without Index

**What goes wrong:** Fuzzy search takes 2+ seconds, making UX poor.

**Why it happens:** pg_trgm without GIN index does sequential scan.

**How to avoid:**
1. Create GIN index: `CREATE INDEX idx_name_trgm USING gin (normalized_name gin_trgm_ops);`
2. Try exact match first (uses btree index)
3. Set similarity threshold (0.3-0.4) to reduce result set
4. EXPLAIN ANALYZE queries to verify index usage

**Warning signs:** Queries > 100ms, database CPU spikes on search

### Pitfall 4: Intent Extraction Latency

**What goes wrong:** Every query takes 500ms-1s just for LLM call.

**Why it happens:** Network round-trip to OpenAI adds latency.

**How to avoid:**
1. Use gpt-4o-mini (fastest, cheapest)
2. Cache common intents (optional, for high-volume)
3. Show "thinking" indicator in UI
4. Consider local fallback for simple patterns (exact asset name match)

**Warning signs:** Users complain about slow responses, p95 latency > 2s

### Pitfall 5: Category Mismatch Between Vietnamese/English

**What goes wrong:** User says "am thanh" (Vietnamese for sound) but system doesn't recognize it.

**Why it happens:** Categories defined in English, Vietnamese not mapped.

**How to avoid:**
1. Include Vietnamese category names in LLM system prompt
2. Map common Vietnamese terms: "am thanh" -> "sound", "hinh anh" -> "2d"
3. Test with Vietnamese-only queries

**Warning signs:** Category filters not working for Vietnamese queries

## Code Examples

### Database Migration: Enable pg_trgm

```typescript
// src/db/migrations/0002_add_trigram.ts
import { sql } from 'drizzle-orm';

export async function up(db: any) {
  // Enable pg_trgm extension
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);

  // Create trigram index on normalized asset names
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_assets_normalized_name_trgm
    ON assets USING gin (normalized_name gin_trgm_ops);
  `);

  // Set similarity threshold (optional, can also set per-query)
  await db.execute(sql`SET pg_trgm.similarity_threshold = 0.3;`);
}

export async function down(db: any) {
  await db.execute(sql`DROP INDEX IF EXISTS idx_assets_normalized_name_trgm;`);
  // Don't drop extension - might be used elsewhere
}
```

### Category Filter Query

```typescript
// src/services/asset/repository.ts
import { db } from '../../db/client';
import { assets, assetVersions } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';

export async function listByCategory(
  category: string,
  limit: number = 10
) {
  return db
    .select({
      id: assets.id,
      rawName: assets.rawName,
      category: assets.category,
      latestVersion: assets.latestVersion,
      updatedAt: assets.updatedAt,
    })
    .from(assets)
    .where(eq(assets.category, category.toLowerCase()))
    .orderBy(desc(assets.updatedAt))
    .limit(limit);
}

export async function getLatestVersion(
  assetName: string,
  category?: string | null
) {
  const normalized = normalizeVietnamese(assetName);

  let query = db
    .select()
    .from(assets)
    .innerJoin(assetVersions, eq(assets.latestVersionId, assetVersions.id))
    .where(eq(assets.normalizedName, normalized));

  if (category) {
    query = query.where(eq(assets.category, category.toLowerCase()));
  }

  const results = await query.limit(1);
  return results[0] ?? null;
}
```

### Combined Fuse.js + Database Search

```typescript
// src/services/search/index.ts
import Fuse from 'fuse.js';
import { fuzzySearchAssets } from './database';
import { normalizeVietnamese } from '../nlp/normalizer';

interface AssetSearchResult {
  id: string;
  rawName: string;
  normalizedName: string;
  category: string;
  score: number;
  source: 'exact' | 'fuse' | 'trgm';
}

// For small result sets, use Fuse.js for refined matching
export function refineFuseSearch(
  candidates: Array<{ id: string; rawName: string; normalizedName: string; category: string }>,
  searchTerm: string
): AssetSearchResult[] {
  const fuse = new Fuse(candidates, {
    keys: ['normalizedName', 'rawName'],
    threshold: 0.4,  // 0 = exact, 1 = match anything
    includeScore: true,
    ignoreLocation: true,  // Match anywhere in string
  });

  const results = fuse.search(normalizeVietnamese(searchTerm));

  return results.map(r => ({
    ...r.item,
    score: 1 - (r.score ?? 0),  // Convert to 0-1 where 1 is best
    source: 'fuse' as const,
  }));
}

// Main search: database first, Fuse.js for refinement
export async function searchAssets(
  searchTerm: string,
  options: { category?: string; limit?: number } = {}
): Promise<AssetSearchResult[]> {
  const { limit = 10 } = options;

  // 1. Get candidates from database using pg_trgm
  const dbResults = await fuzzySearchAssets(searchTerm, {
    limit: limit * 2,  // Get extra for Fuse.js refinement
    minSimilarity: 0.2,
  });

  if (dbResults.length === 0) {
    return [];
  }

  // 2. Refine with Fuse.js for better scoring
  const refined = refineFuseSearch(dbResults, searchTerm);

  // 3. Filter by category if specified
  let filtered = refined;
  if (options.category) {
    filtered = refined.filter(r => r.category === options.category.toLowerCase());
  }

  return filtered.slice(0, limit);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Train NLP models for intent | LLM function calling | 2024 | Zero training data needed, multilingual |
| generateObject (AI SDK) | generateText with Output.object() | AI SDK 6 (2025) | Unified API, tool calling support |
| node-nlp for Vietnamese | LLM with structured output | 2024 | Better accuracy, no training |
| PGroonga for all FTS | pg_trgm for fuzzy + native FTS | N/A | pg_trgm sufficient for asset names |
| Custom similarity scoring | pg_trgm similarity() | N/A | Built-in, indexed, proven |

**Deprecated/outdated:**
- `generateObject` in Vercel AI SDK: Use `generateText` with `Output.object()` instead
- Training NLP models for small intent sets: LLM zero-shot is better
- LIKE queries for fuzzy search: Use pg_trgm

## Open Questions

1. **LLM cost at scale**
   - What we know: gpt-4o-mini costs ~$0.00015 per query (500 tokens avg)
   - What's unclear: Volume projections - 10 users * 20 queries/day = 200 queries/day = $0.03/day
   - Recommendation: Monitor usage, cache if needed, budget $5/month initially

2. **Caching intent extraction**
   - What we know: Same queries often repeat ("ho ly moi nhat?")
   - What's unclear: Hit rate, cache invalidation strategy
   - Recommendation: Defer to Phase 2.1 if latency becomes issue; simple Redis TTL cache

3. **PGroonga vs pg_trgm for Vietnamese**
   - What we know: Both support Vietnamese, pg_trgm is simpler
   - What's unclear: Performance difference at scale
   - Recommendation: Start with pg_trgm (already native), migrate to PGroonga only if needed

4. **Vietnamese category names**
   - What we know: Users may query in Vietnamese ("am thanh" for sound)
   - What's unclear: Full list of Vietnamese terms team uses
   - Recommendation: Include common mappings in LLM prompt, refine based on usage

## Sources

### Primary (HIGH confidence)
- [Vercel AI SDK Documentation](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data) - Structured output patterns, generateText API
- [AI SDK 6 Announcement](https://vercel.com/blog/ai-sdk-6) - Latest API changes, agent abstraction
- [PostgreSQL pg_trgm Documentation](https://www.postgresql.org/docs/current/pgtrgm.html) - Trigram operators, GIN indexes
- [Fuse.js Documentation](https://www.fusejs.io/api/options.html) - Threshold, scoring options
- [Drizzle ORM Full-Text Search](https://orm.drizzle.team/docs/guides/postgresql-full-text-search) - PostgreSQL FTS patterns

### Secondary (MEDIUM confidence)
- [Vercel Academy Structured Data Extraction](https://vercel.com/academy/ai-sdk/structured-data-extraction) - Code patterns for Zod schemas
- [PGroonga vs pg_trgm](https://pgroonga.github.io/reference/pgroonga-versus-textsearch-and-pg-trgm.html) - Comparison for multilingual
- [Intent Classification 2025 Techniques](https://labelyourdata.com/articles/machine-learning/intent-classification) - Hybrid LLM + classifier approaches
- [Optimizing Postgres Trigram Search](https://alexklibisz.com/2022/02/18/optimizing-postgres-trigram-search) - Performance patterns

### Tertiary (LOW confidence)
- [node-nlp-typescript](https://github.com/Leoglme/node-nlp-typescript) - Alternative to LLM, but no Vietnamese support
- [Vietnamese NLP Toolkit](https://github.com/vunb/vntk) - Node.js Vietnamese NLP, but limited intent classification

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Verified via official docs, already using Fuse.js/Drizzle/Zod
- Architecture: HIGH - Patterns from Vercel AI SDK docs and PostgreSQL docs
- Pitfalls: MEDIUM - Based on research, need validation in implementation

**Research date:** 2026-01-23
**Valid until:** 2026-02-23 (30 days - AI SDK and pg_trgm are stable)
