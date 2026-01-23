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

// Main query function
export { executeQuery, executeQuery as query } from './executor.js';

// Types
export type { QueryResult, QueryResultType } from './executor.js';
export type { QueryIntent, IntentExtractionResult } from './intent.js';
export { QueryIntentSchema, IntentType, AssetCategory } from './types.js';

// For advanced usage - direct intent extraction
export { extractIntent, extractIntentSafe } from './intent.js';
