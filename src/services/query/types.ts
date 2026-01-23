// src/services/query/types.ts
import { z } from 'zod';

/**
 * Query intent types:
 * - search: Find assets by name (fuzzy match)
 * - latest: Get latest version of specific asset
 * - list_category: List all assets in a category
 * - version_history: Get version timeline for an asset
 * - unknown: Query couldn't be understood
 */
export const IntentType = z.enum([
  'search',
  'latest',
  'list_category',
  'version_history',
  'unknown',
]);

export type IntentType = z.infer<typeof IntentType>;

/**
 * Asset categories (matches PROJECT.md)
 */
export const AssetCategory = z.enum([
  'sound',
  '3d',
  '2d',
  'animation',
  'ui',
  'story',
]);

export type AssetCategory = z.infer<typeof AssetCategory>;

/**
 * Structured query intent schema for LLM output
 *
 * The LLM extracts these fields from natural language:
 * - intent: What type of query is this?
 * - assetName: What asset is the user asking about? (normalized, no diacritics)
 * - category: Is there a category filter?
 * - limit: How many results? (default 10)
 */
export const QueryIntentSchema = z.object({
  intent: IntentType
    .describe('The type of query the user is making'),

  assetName: z.string().nullable()
    .describe('The asset name being searched for, normalized without Vietnamese diacritics. Extract exactly what the user said, do not invent names.'),

  category: AssetCategory.nullable()
    .describe('The asset category filter, if specified or implied'),

  limit: z.number().nullable()
    .describe('Number of results to return if specified, otherwise null for default'),

  confidence: z.enum(['high', 'medium', 'low'])
    .describe('How confident are you in this interpretation?'),
});

export type QueryIntent = z.infer<typeof QueryIntentSchema>;

/**
 * Intent extraction result with metadata
 */
export interface IntentExtractionResult {
  intent: QueryIntent;
  originalQuery: string;
  processingTimeMs: number;
}
