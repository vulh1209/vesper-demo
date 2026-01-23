/**
 * Search service entry point.
 * Provides search orchestration combining exact and fuzzy matching with category filtering.
 */
import { searchAssets, fuzzySearchAssets, exactSearchAsset, listAssetsByCategory } from './database.js';
import type { SearchOptions, SearchResponse, SearchResult } from './types.js';

// Re-export types
export type { SearchResult, SearchOptions, SearchResponse } from './types.js';

// Valid categories (from PROJECT.md)
const VALID_CATEGORIES = ['sound', '3d', '2d', 'animation', 'ui', 'story'] as const;
export type AssetCategory = typeof VALID_CATEGORIES[number];

/**
 * Normalize search query for consistent matching.
 * Vietnamese diacritics removal is handled by the normalizer service.
 * This function handles basic normalization.
 */
function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .trim()
    .replace(/[_\-]+/g, ' ')  // Convert separators to spaces
    .replace(/\s+/g, ' ');     // Collapse multiple spaces
}

/**
 * Validate category string.
 */
export function isValidCategory(category: string): category is AssetCategory {
  return VALID_CATEGORIES.includes(category.toLowerCase() as AssetCategory);
}

/**
 * Main search function - the primary API for searching assets.
 *
 * @param query - Asset name to search for
 * @param options - Search options (limit, category, minSimilarity)
 * @returns SearchResponse with ranked results
 *
 * @example
 * // Simple search
 * const results = await search('ho ly');
 *
 * // With category filter
 * const sounds = await search('boss theme', { category: 'sound' });
 *
 * // With custom limit
 * const top5 = await search('character', { limit: 5 });
 */
export async function search(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResponse> {
  // Normalize the query
  const normalizedQuery = normalizeQuery(query);

  if (!normalizedQuery) {
    return {
      results: [],
      matchType: 'none',
      query: '',
      totalFound: 0,
    };
  }

  // Validate category if provided
  if (options.category && !isValidCategory(options.category)) {
    console.warn(`Invalid category: ${options.category}. Valid: ${VALID_CATEGORIES.join(', ')}`);
    // Continue without category filter rather than failing
    options = { ...options, category: undefined };
  }

  // Delegate to database search
  return searchAssets(normalizedQuery, options);
}

/**
 * List assets by category.
 *
 * @param category - Category to filter by
 * @param limit - Maximum results to return
 * @returns Array of assets in that category
 */
export async function listByCategory(
  category: string,
  limit: number = 10
): Promise<SearchResult[]> {
  if (!isValidCategory(category)) {
    throw new Error(`Invalid category: ${category}. Valid: ${VALID_CATEGORIES.join(', ')}`);
  }

  return listAssetsByCategory(category, limit);
}

// Export individual functions for advanced use cases
export { searchAssets, fuzzySearchAssets, exactSearchAsset, listAssetsByCategory } from './database.js';
