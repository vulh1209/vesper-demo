// src/services/query/intent.ts
import { generateObject } from 'ai';
import { getModelWithFallback } from '../../config/llm.js';
import { QueryIntentSchema, type QueryIntent, type IntentExtractionResult } from './types';
import { normalizeVietnamese } from '../nlp/normalizer';

/**
 * System prompt for intent extraction
 *
 * Key instructions:
 * 1. Parse Vietnamese OR English queries
 * 2. Normalize Vietnamese: remove diacritics (Hồ Ly -> ho ly)
 * 3. Extract what user SAID, don't invent asset names
 * 4. Map Vietnamese category words to English
 */
const SYSTEM_PROMPT = `You are a query parser for a Vietnamese game studio's asset tracking system.
Parse the user's query (Vietnamese or English) into structured intent.

## Asset Categories
- sound (Vietnamese: âm thanh, nhạc, audio)
- 3d (Vietnamese: mô hình 3D, model)
- 2d (Vietnamese: hình ảnh, concept art, hình vẽ)
- animation (Vietnamese: animation, hoạt hình, chuyển động)
- ui (Vietnamese: giao diện, UI, menu)
- story (Vietnamese: kịch bản, truyện, narrative)

## Query Types
- "latest" - User wants the newest version: "mới nhất", "latest", "version mới", "bản mới"
- "search" - User looking for assets by name: "tìm", "search", "có không", "where is"
- "list_category" - User wants to see all in category: "list all sounds", "tất cả animation"
- "version_history" - User wants version timeline: "lịch sử", "history", "các version"

## Normalization Rules
- Remove Vietnamese diacritics: Hồ Ly -> ho ly, đẹp -> dep
- Lowercase everything
- Convert separators: ho_ly -> ho ly

## Examples
- "Hồ Ly mới nhất?" -> intent: latest, assetName: "ho ly"
- "Show me all sounds" -> intent: list_category, category: sound
- "lịch sử boss theme" -> intent: version_history, assetName: "boss theme"
- "tìm character rig" -> intent: search, assetName: "character rig"
- "có model nào của Thần Hổ không?" -> intent: search, assetName: "than ho", category: 3d

## Important
- Extract the asset name EXACTLY as stated (after normalization), do not guess or invent names
- If you can't understand the query, use intent: "unknown"
- Vietnamese category words should map to English category enum values`;

/**
 * Extract structured intent from natural language query
 *
 * Uses configured LLM provider (Gemini or OpenAI) with automatic fallback.
 * ~$0.00005/query with Gemini, ~$0.00015/query with OpenAI (500 tokens average).
 *
 * @param userQuery - Natural language query in Vietnamese or English
 * @returns Structured intent with asset name, category, and query type
 *
 * @example
 * const intent = await extractIntent('Hồ Ly mới nhất?');
 * // { intent: 'latest', assetName: 'ho ly', category: null, limit: null, confidence: 'high' }
 *
 * @example
 * const intent = await extractIntent('Show me all sounds');
 * // { intent: 'list_category', assetName: null, category: 'sound', limit: null, confidence: 'high' }
 */
export async function extractIntent(userQuery: string): Promise<IntentExtractionResult> {
  const startTime = Date.now();

  // Pre-normalize the query for the LLM (helps with consistency)
  const normalizedQuery = normalizeVietnamese(userQuery);

  const { object } = await generateObject({
    model: getModelWithFallback(),
    schema: QueryIntentSchema,
    system: SYSTEM_PROMPT,
    prompt: `Parse this query: "${userQuery}"

Normalized form: "${normalizedQuery}"
Today's date: ${new Date().toISOString().split('T')[0]}`,
  });

  const processingTimeMs = Date.now() - startTime;

  return {
    intent: object,
    originalQuery: userQuery,
    processingTimeMs,
  };
}

/**
 * Extract intent with fallback for API errors
 *
 * If LLM fails, returns unknown intent rather than throwing
 */
export async function extractIntentSafe(userQuery: string): Promise<IntentExtractionResult> {
  try {
    return await extractIntent(userQuery);
  } catch (error) {
    console.error('Intent extraction failed:', error);

    // Return search intent on error (graceful degradation - treat query as potential asset name)
    return {
      intent: {
        intent: 'search',
        assetName: normalizeVietnamese(userQuery),  // Use query as potential asset name
        category: null,
        limit: null,
        confidence: 'low',
      },
      originalQuery: userQuery,
      processingTimeMs: 0,
    };
  }
}

// Re-export types
export type { QueryIntent, IntentExtractionResult } from './types';
export { QueryIntentSchema, IntentType, AssetCategory } from './types';
