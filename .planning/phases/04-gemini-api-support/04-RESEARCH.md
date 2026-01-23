# Phase 4: Gemini API Support - Research

**Researched:** 2026-01-23
**Domain:** Multi-provider LLM integration (OpenAI + Google Gemini)
**Confidence:** HIGH

## Summary

Phase 4 adds Google Gemini as an alternative LLM provider for intent extraction, complementing the existing OpenAI integration. The Vercel AI SDK already supports Google Gemini through `@ai-sdk/google` with the same API surface (`generateObject`/`generateText`) used for OpenAI. This makes provider switching straightforward - the core abstraction is already built into the SDK.

The recommended approach uses **environment-based provider selection**: when `GEMINI_API_KEY` is set, use Gemini; otherwise fall back to OpenAI. For production resilience, the `ai-fallback` package enables automatic failover between providers when one experiences downtime. Both providers support structured output with Zod schemas, and Gemini handles Vietnamese queries well (supports 100+ languages including Vietnamese).

**Primary recommendation:** Install `@ai-sdk/google`, create a provider factory function that returns the appropriate model based on environment configuration, and add `ai-fallback` for automatic failover. The existing `generateObject` pattern works unchanged with Gemini - just swap the model.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @ai-sdk/google | latest | Google Gemini provider for AI SDK | Official provider, same API as @ai-sdk/openai |
| ai-fallback | 2.x | Automatic provider failover | Works with AI SDK 6, zero-dependency |
| ai | 6.x | Already installed | Unified API for all providers |
| @ai-sdk/openai | 3.x | Already installed | Current OpenAI provider |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | 4.x | Already installed | Schema validation for structured output |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| ai-fallback | Vercel AI Gateway | AI Gateway is paid service, ai-fallback is free OSS |
| Environment-based switching | LiteLLM proxy | Adds infrastructure complexity, overkill for 2 providers |
| gemini-2.0-flash | gemini-2.5-flash | 2.5 is 3x more expensive ($0.30 vs $0.10 input), unnecessary for intent extraction |

**Installation:**
```bash
npm install @ai-sdk/google ai-fallback
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── services/
│   └── query/
│       ├── intent.ts           # Intent extraction (updated)
│       ├── provider.ts         # NEW: Provider factory
│       ├── types.ts            # Unchanged
│       └── test.ts             # Update tests
├── config/
│   └── llm.ts                  # NEW: LLM configuration
└── ...
```

### Pattern 1: Provider Factory with Environment Detection

**What:** Factory function that returns the appropriate model based on environment variables.

**When to use:** Entry point for all LLM operations - centralizes provider selection logic.

**Example:**
```typescript
// src/config/llm.ts
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';

export type LLMProvider = 'openai' | 'gemini';

export interface LLMConfig {
  provider: LLMProvider;
  model: ReturnType<typeof openai> | ReturnType<typeof google>;
  modelId: string;
}

/**
 * Get LLM configuration based on environment variables
 *
 * Priority:
 * 1. LLM_PROVIDER env var (explicit selection)
 * 2. GEMINI_API_KEY presence (prefer Gemini if configured)
 * 3. OPENAI_API_KEY (fallback to OpenAI)
 */
export function getLLMConfig(): LLMConfig {
  const explicitProvider = process.env.LLM_PROVIDER as LLMProvider | undefined;

  if (explicitProvider === 'gemini' ||
      (!explicitProvider && process.env.GEMINI_API_KEY)) {
    return {
      provider: 'gemini',
      model: google('gemini-2.0-flash'),
      modelId: 'gemini-2.0-flash',
    };
  }

  return {
    provider: 'openai',
    model: openai('gpt-4o-mini'),
    modelId: 'gpt-4o-mini',
  };
}

/**
 * Check if fallback is available (both providers configured)
 */
export function hasFallbackAvailable(): boolean {
  return !!(process.env.OPENAI_API_KEY && process.env.GEMINI_API_KEY);
}
```

### Pattern 2: Fallback Model with ai-fallback

**What:** Automatic failover between providers when primary experiences errors.

**When to use:** Production deployments where uptime is critical.

**Example:**
```typescript
// src/config/llm.ts (extended)
import { createFallback } from 'ai-fallback';
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';

/**
 * Create model with automatic failover
 * Falls back to secondary provider on rate limits, timeouts, or errors
 */
export function getModelWithFallback() {
  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;

  if (hasGemini && hasOpenAI) {
    // Both available: use fallback
    return createFallback({
      models: [
        google('gemini-2.0-flash'),  // Primary: cheaper
        openai('gpt-4o-mini'),        // Fallback
      ],
      onError: (error, modelId) => {
        console.warn(`LLM error with ${modelId}:`, error.message);
      },
      modelResetInterval: 5 * 60 * 1000, // Retry primary after 5 min
    });
  }

  // Single provider mode
  if (hasGemini) return google('gemini-2.0-flash');
  if (hasOpenAI) return openai('gpt-4o-mini');

  throw new Error('No LLM provider configured. Set OPENAI_API_KEY or GEMINI_API_KEY.');
}
```

### Pattern 3: Updated Intent Extraction

**What:** Use provider factory in intent extraction, keeping existing logic unchanged.

**When to use:** Replace hardcoded `openai('gpt-4o-mini')` with factory call.

**Example:**
```typescript
// src/services/query/intent.ts (updated)
import { generateObject } from 'ai';
import { getModelWithFallback } from '../../config/llm';
import { QueryIntentSchema, type QueryIntent, type IntentExtractionResult } from './types';
import { normalizeVietnamese } from '../nlp/normalizer';

const SYSTEM_PROMPT = `...`; // Unchanged

export async function extractIntent(userQuery: string): Promise<IntentExtractionResult> {
  const startTime = Date.now();
  const normalizedQuery = normalizeVietnamese(userQuery);

  // Use provider factory instead of hardcoded openai()
  const model = getModelWithFallback();

  const { object } = await generateObject({
    model,
    schema: QueryIntentSchema,
    system: SYSTEM_PROMPT,
    prompt: `Parse this query: "${userQuery}"

Normalized form: "${normalizedQuery}"
Today's date: ${new Date().toISOString().split('T')[0]}`,
  });

  return {
    intent: object,
    originalQuery: userQuery,
    processingTimeMs: Date.now() - startTime,
  };
}
```

### Pattern 4: Graceful Degradation

**What:** Handle LLM unavailability without breaking the application.

**When to use:** When both providers are down or API keys missing.

**Example:**
```typescript
// src/services/query/intent.ts
export async function extractIntentSafe(userQuery: string): Promise<IntentExtractionResult> {
  try {
    return await extractIntent(userQuery);
  } catch (error) {
    console.error('Intent extraction failed:', error);

    // Graceful degradation: treat query as potential asset name
    return {
      intent: {
        intent: 'search',  // Default to search
        assetName: normalizeVietnamese(userQuery),
        category: null,
        limit: null,
        confidence: 'low',
      },
      originalQuery: userQuery,
      processingTimeMs: 0,
    };
  }
}
```

### Anti-Patterns to Avoid

- **Provider lock-in:** Don't import `openai()` directly in service files. Use provider factory.
- **Missing fallback handling:** Don't assume LLM is always available. Use `extractIntentSafe`.
- **Hardcoded model IDs:** Centralize model selection in config, not scattered across codebase.
- **Ignoring cost differences:** Don't use expensive models (gemini-2.5-pro) for simple intent extraction.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Provider failover | Retry loops with provider switching | ai-fallback | Handles edge cases, model reset intervals |
| Structured output | JSON.parse with try/catch | generateObject with Zod | Type-safe, validated, provider-agnostic |
| Provider abstraction | Custom wrapper around both SDKs | Vercel AI SDK provider pattern | Already built, tested, maintained |
| Environment detection | Complex if/else chains | Simple factory with env checks | Keeps logic centralized |

**Key insight:** The Vercel AI SDK already provides provider abstraction. Adding Gemini is literally `npm install @ai-sdk/google` and changing one line of code. The complexity is in fallback/resilience, not provider integration.

## Common Pitfalls

### Pitfall 1: generateObject Deprecation in AI SDK 6

**What goes wrong:** The project uses `generateObject` which is deprecated in AI SDK 6. Future SDK updates may remove it.

**Why it happens:** AI SDK 6 unified `generateObject` into `generateText` with `Output.object()`.

**How to avoid:**
1. For now, `generateObject` still works in 6.0.49 - no immediate action required
2. When migrating, change `generateObject({ schema })` to `generateText({ output: Output.object({ schema }) })`
3. Change result destructuring from `{ object }` to `{ output }`

**Warning signs:** Deprecation warnings in console, SDK upgrade breaking

**Migration example (when ready):**
```typescript
// Before (deprecated)
const { object } = await generateObject({
  model,
  schema: QueryIntentSchema,
  prompt: '...',
});

// After (AI SDK 6 pattern)
import { Output } from 'ai';

const { output } = await generateText({
  model,
  output: Output.object({ schema: QueryIntentSchema }),
  prompt: '...',
});
```

### Pitfall 2: Missing GOOGLE_GENERATIVE_AI_API_KEY

**What goes wrong:** App crashes on startup because Gemini provider can't initialize.

**Why it happens:** @ai-sdk/google looks for `GOOGLE_GENERATIVE_AI_API_KEY` by default.

**How to avoid:**
1. Document both `GEMINI_API_KEY` and `GOOGLE_GENERATIVE_AI_API_KEY` (they're the same)
2. Use provider factory that checks key presence before creating model
3. Fail gracefully with clear error message

**Warning signs:** "Invalid API key" errors, cryptic initialization failures

### Pitfall 3: Gemini Structured Output Limitations

**What goes wrong:** generateObject fails with complex schemas on Gemini.

**Why it happens:** Gemini's JSON Schema support doesn't handle all Zod features (unions, records).

**How to avoid:**
1. Keep schemas simple (basic types, arrays, objects)
2. Current `QueryIntentSchema` is compatible (uses only enums, strings, numbers)
3. If needed, disable structured output: `providerOptions: { google: { structuredOutputs: false } }`

**Warning signs:** Schema validation errors specific to Gemini, "Unsupported type" messages

### Pitfall 4: Different Error Formats Between Providers

**What goes wrong:** Error handling assumes OpenAI error format, breaks with Gemini errors.

**Why it happens:** Each provider has different error structures.

**How to avoid:**
1. Use try/catch with generic error handling
2. Log error.message, not provider-specific properties
3. ai-fallback normalizes errors for you

**Warning signs:** "undefined" in error logs, inconsistent error messages

### Pitfall 5: Cost Creep with Wrong Gemini Model

**What goes wrong:** Using gemini-2.5-flash instead of 2.0-flash triples costs.

**Why it happens:** Newer isn't always better for simple tasks.

**How to avoid:**
1. Use gemini-2.0-flash for intent extraction (~$0.10 per 1M input tokens)
2. Only use 2.5+ for complex reasoning tasks
3. Monitor usage with provider-specific cost tracking

**Warning signs:** Higher than expected Gemini bills, "thinking" taking long

## Code Examples

### Environment Configuration (.env.example update)

```bash
# Database
DATABASE_URL=postgres://vesper:vesper@localhost:5432/vesper

# Redis (for BullMQ)
REDIS_URL=redis://localhost:6379

# Slack
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_APP_TOKEN=xapp-your-app-token

# Workspace
SLACK_WORKSPACE_URL=https://your-workspace.slack.com

# LLM Providers (at least one required)
# OpenAI - gpt-4o-mini for intent extraction
OPENAI_API_KEY=sk-your-openai-api-key

# Google Gemini - gemini-2.0-flash alternative
# When set, Gemini becomes primary with OpenAI as fallback
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-api-key

# Optional: Force specific provider (overrides auto-detection)
# LLM_PROVIDER=openai|gemini
```

### Provider Status Check

```typescript
// src/config/llm.ts
export function getProviderStatus(): {
  primary: LLMProvider | null;
  fallback: LLMProvider | null;
  hasFallback: boolean;
} {
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasGemini = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const explicit = process.env.LLM_PROVIDER as LLMProvider | undefined;

  if (!hasOpenAI && !hasGemini) {
    return { primary: null, fallback: null, hasFallback: false };
  }

  if (explicit === 'openai' || (!explicit && !hasGemini)) {
    return {
      primary: 'openai',
      fallback: hasGemini ? 'gemini' : null,
      hasFallback: hasGemini,
    };
  }

  return {
    primary: 'gemini',
    fallback: hasOpenAI ? 'openai' : null,
    hasFallback: hasOpenAI,
  };
}
```

### Test Script for Both Providers

```typescript
// src/services/query/test-providers.ts
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { QueryIntentSchema } from './types';

async function testProvider(
  name: string,
  model: ReturnType<typeof google> | ReturnType<typeof openai>,
  query: string
) {
  console.log(`\n--- Testing ${name} ---`);
  console.log(`Query: "${query}"`);

  const start = Date.now();
  try {
    const { object } = await generateObject({
      model,
      schema: QueryIntentSchema,
      prompt: query,
    });
    console.log(`Result:`, object);
    console.log(`Time: ${Date.now() - start}ms`);
  } catch (error) {
    console.error(`Error:`, error);
  }
}

async function main() {
  const testQueries = [
    'Ho ly moi nhat?',
    'Show me all sounds',
    'lich su boss theme',
  ];

  for (const query of testQueries) {
    if (process.env.OPENAI_API_KEY) {
      await testProvider('OpenAI', openai('gpt-4o-mini'), query);
    }
    if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      await testProvider('Gemini', google('gemini-2.0-flash'), query);
    }
  }
}

main();
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| generateObject | generateText + Output.object | AI SDK 6 (2025) | Unified API, deprecated but working |
| Gemini 1.5 Flash | Gemini 2.0 Flash | Late 2025 | 50% cheaper, faster |
| Custom retry logic | ai-fallback package | 2024 | Production-ready fallback |
| Single provider | Multi-provider with fallback | 2025 best practice | Higher availability |

**Deprecated/outdated:**
- `generateObject`: Use `generateText` with `Output.object()` - but still works in SDK 6.0.49
- Gemini 1.5 Flash: Use 2.0-flash, 1.5 is more expensive
- `gemini-pro`: Old model, use `gemini-2.0-flash` instead

**Model naming note:** Gemini 2.0 Flash will be retired March 3, 2026. Plan migration to 2.5-flash-lite.

## Gemini Pricing Reference

| Model | Input (text) | Output | Notes |
|-------|--------------|--------|-------|
| gemini-2.0-flash | $0.10/1M tokens | $0.40/1M | Best for intent extraction |
| gemini-2.5-flash | $0.30/1M tokens | $2.50/1M | Overkill for simple tasks |
| gemini-3-flash-preview | $0.50/1M tokens | $3.00/1M | Future option, not needed now |

**Cost comparison for intent extraction (~500 tokens/query):**
- OpenAI gpt-4o-mini: ~$0.00015 per query
- Gemini 2.0-flash: ~$0.00005 per query (3x cheaper)

Free tier available for development.

## Open Questions

1. **generateObject deprecation timeline**
   - What we know: Deprecated in AI SDK 6 but still works
   - What's unclear: When it will be removed
   - Recommendation: Keep using for now, migrate when SDK upgrade required

2. **Gemini 2.0 Flash retirement**
   - What we know: Retiring March 3, 2026
   - What's unclear: Whether gemini-2.5-flash-lite is direct replacement
   - Recommendation: Use 2.0-flash now, plan migration in Q1 2026

3. **ai-fallback generateObject support**
   - What we know: Docs show streamObject, not generateObject
   - What's unclear: If generateObject works (likely yes, same interface)
   - Recommendation: Test with fallback model, verify in implementation

## Sources

### Primary (HIGH confidence)
- [AI SDK Google Provider](https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai) - Installation, model IDs, configuration
- [AI SDK Migration Guide 6.0](https://ai-sdk.dev/docs/migration-guides/migration-guide-6-0) - generateObject deprecation
- [Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing) - Model costs
- [Gemini Structured Output](https://ai.google.dev/gemini-api/docs/structured-output) - JSON Schema support

### Secondary (MEDIUM confidence)
- [ai-fallback GitHub](https://github.com/remorses/ai-fallback) - Fallback implementation
- [AI SDK Providers and Models](https://ai-sdk.dev/docs/foundations/providers-and-models) - Multi-provider concepts
- [Gemini Multilingual Support](https://firebase.google.com/docs/ai-logic/models) - Vietnamese language support

### Tertiary (LOW confidence)
- Blog posts on multi-provider patterns - General patterns, needs validation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official SDK providers, verified docs
- Architecture: HIGH - Follows existing patterns in codebase
- Pitfalls: MEDIUM - Based on research, validated against current implementation

**Research date:** 2026-01-23
**Valid until:** 2026-02-23 (30 days - SDK stable, Gemini 2.0 retiring March 2026)
