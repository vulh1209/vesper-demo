// src/services/query/test-providers.ts
/**
 * Test script to compare Gemini and OpenAI provider behavior
 *
 * Tests both providers with Vietnamese and English queries to verify:
 * - Both produce valid QueryIntent objects
 * - Vietnamese queries are handled correctly
 * - Response times are comparable
 *
 * Usage: npm run test:providers
 */
import 'dotenv/config';
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { QueryIntentSchema, type QueryIntent } from './types.js';

// Test queries covering different intent types and Vietnamese
const TEST_QUERIES = [
  'Ho ly moi nhat?',           // Vietnamese: latest version
  'Show me all sounds',         // English: category list
  'lich su boss theme',         // Vietnamese: version history
];

interface ProviderResult {
  provider: string;
  query: string;
  intent: QueryIntent;
  timeMs: number;
  error?: string;
}

const SYSTEM_PROMPT = `You are a query parser for a Vietnamese game studio's asset tracking system.
Parse the user's query (Vietnamese or English) into structured intent.

## Asset Categories
- sound (Vietnamese: am thanh, nhac, audio)
- 3d (Vietnamese: mo hinh 3D, model)
- 2d (Vietnamese: hinh anh, concept art)
- animation (Vietnamese: animation, hoat hinh)
- ui (Vietnamese: giao dien, UI, menu)
- story (Vietnamese: kich ban, truyen, narrative)

## Query Types
- "latest" - User wants the newest version: "moi nhat", "latest", "version moi"
- "search" - User looking for assets by name: "tim", "search", "co khong"
- "list_category" - User wants to see all in category: "list all sounds", "tat ca animation"
- "version_history" - User wants version timeline: "lich su", "history", "cac version"

## Important
- Extract the asset name EXACTLY as stated (normalized), do not guess or invent names
- If you can't understand the query, use intent: "unknown"`;

async function testProvider(
  name: string,
  model: ReturnType<typeof openai> | ReturnType<typeof google>,
  query: string
): Promise<ProviderResult> {
  const startTime = Date.now();

  try {
    const { object } = await generateObject({
      model,
      schema: QueryIntentSchema,
      system: SYSTEM_PROMPT,
      prompt: `Parse this query: "${query}"`,
    });

    return {
      provider: name,
      query,
      intent: object,
      timeMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      provider: name,
      query,
      intent: {
        intent: 'unknown',
        assetName: null,
        category: null,
        limit: null,
        confidence: 'low',
      },
      timeMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function formatResult(result: ProviderResult): string {
  const status = result.error ? `ERROR: ${result.error}` : 'OK';
  return `
  Provider: ${result.provider}
  Query: "${result.query}"
  Status: ${status}
  Time: ${result.timeMs}ms
  Intent: ${result.intent.intent}
  Asset: ${result.intent.assetName ?? '(none)'}
  Category: ${result.intent.category ?? '(none)'}
  Confidence: ${result.intent.confidence}`;
}

async function main() {
  console.log('='.repeat(60));
  console.log('LLM Provider Comparison Test');
  console.log('='.repeat(60));

  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasGemini = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  console.log(`\nProviders available:`);
  console.log(`  OpenAI: ${hasOpenAI ? 'YES' : 'NO (OPENAI_API_KEY not set)'}`);
  console.log(`  Gemini: ${hasGemini ? 'YES' : 'NO (GOOGLE_GENERATIVE_AI_API_KEY not set)'}`);

  if (!hasOpenAI && !hasGemini) {
    console.error('\nERROR: No providers configured. Set at least one API key.');
    process.exit(1);
  }

  const results: ProviderResult[] = [];

  // Test OpenAI if available
  if (hasOpenAI) {
    console.log('\n--- Testing OpenAI (gpt-4o-mini) ---');
    for (const query of TEST_QUERIES) {
      const result = await testProvider('OpenAI', openai('gpt-4o-mini'), query);
      results.push(result);
      console.log(formatResult(result));
    }
  }

  // Test Gemini if available
  if (hasGemini) {
    console.log('\n--- Testing Gemini (gemini-2.0-flash) ---');
    for (const query of TEST_QUERIES) {
      const result = await testProvider('Gemini', google('gemini-2.0-flash'), query);
      results.push(result);
      console.log(formatResult(result));
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));

  // Calculate averages by provider
  const byProvider = results.reduce((acc, r) => {
    if (!acc[r.provider]) {
      acc[r.provider] = { total: 0, count: 0, errors: 0 };
    }
    acc[r.provider].total += r.timeMs;
    acc[r.provider].count++;
    if (r.error) acc[r.provider].errors++;
    return acc;
  }, {} as Record<string, { total: number; count: number; errors: number }>);

  for (const [provider, stats] of Object.entries(byProvider)) {
    const avgTime = Math.round(stats.total / stats.count);
    console.log(`\n${provider}:`);
    console.log(`  Queries: ${stats.count}`);
    console.log(`  Errors: ${stats.errors}`);
    console.log(`  Avg time: ${avgTime}ms`);
  }

  // Side-by-side comparison if both available
  if (hasOpenAI && hasGemini) {
    console.log('\n--- Intent Comparison ---');
    for (const query of TEST_QUERIES) {
      const openaiResult = results.find(r => r.provider === 'OpenAI' && r.query === query);
      const geminiResult = results.find(r => r.provider === 'Gemini' && r.query === query);

      const match = openaiResult?.intent.intent === geminiResult?.intent.intent;
      console.log(`\nQuery: "${query}"`);
      console.log(`  OpenAI: ${openaiResult?.intent.intent} (${openaiResult?.intent.assetName ?? 'null'})`);
      console.log(`  Gemini: ${geminiResult?.intent.intent} (${geminiResult?.intent.assetName ?? 'null'})`);
      console.log(`  Match: ${match ? 'YES' : 'NO'}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Test complete.');
}

main().catch(console.error);
