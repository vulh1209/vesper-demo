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

// ============================================================
// HTTP API Types - For Hono API responses (Phase 3)
// ============================================================

/**
 * Asset query result for API responses
 * Simplified view of an asset with basic info
 */
export interface AssetQueryResult {
  id: string;
  name: string;
  normalizedName: string;
  category: string | null;
  latestVersion: string | null;
  slackPermalink: string | null;
  updatedAt: Date;
}

/**
 * Asset detail result with version history
 * Extended view including all versions
 */
export interface AssetDetailResult extends AssetQueryResult {
  versions: {
    version: string;
    author: string | null;
    authorName: string | null;
    createdAt: Date;
    slackPermalink: string | null;
  }[];
}

/**
 * Search parameters for HTTP API
 */
export interface SearchParams {
  query: string;
  category?: string;
  limit?: number;
}

/**
 * Standard search response for HTTP API
 */
export interface SearchResponse {
  ok: boolean;
  data: AssetQueryResult[];
  query: string;
  matchType: 'exact' | 'fuzzy';
}

/**
 * Asset detail response for HTTP API
 */
export interface AssetResponse {
  ok: boolean;
  data: AssetDetailResult | null;
  error?: string;
}
