/**
 * Query Service - Public API
 *
 * Entry point for natural language asset queries.
 * Handles Vietnamese and English queries.
 *
 * @example
 * import { query } from './services/query';
 *
 * const result = await query('Ho Ly moi nhat?');
 * console.log(result.message);  // "Latest version of Ho Ly: v3"
 * console.log(result.data);     // [{ rawName: "Ho Ly", version: "3", ... }]
 */

// Main query function (NLP-based)
export { executeQuery, executeQuery as query } from './executor.js';

// HTTP API functions
export { searchAssets, getAssetDetail, findAssetByName } from './asset-query.js';

// Types - NLP query types
export type { QueryResult, QueryResultType } from './executor.js';
export type { QueryIntent, IntentExtractionResult } from './intent.js';
export { QueryIntentSchema, IntentType, AssetCategory } from './types.js';

// Types - HTTP API types
export type {
  AssetQueryResult,
  AssetDetailResult,
  SearchParams,
  SearchResponse,
  AssetResponse,
} from './types.js';

// For advanced usage - direct intent extraction
export { extractIntent, extractIntentSafe } from './intent.js';
