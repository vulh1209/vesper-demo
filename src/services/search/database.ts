/**
 * Database search service using PostgreSQL pg_trgm for fuzzy matching.
 * Provides exact match, fuzzy search, combined search, and category filtering.
 */
import { sql, eq, and } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { assets } from '../../db/schema.js';
import type { SearchResult, SearchOptions, SearchResponse } from './types.js';

/**
 * Search for exact match on normalized name.
 * Fast path - uses btree index.
 */
export async function exactSearchAsset(
  normalizedQuery: string,
  category?: string
): Promise<SearchResult | null> {
  const conditions = [eq(assets.normalizedName, normalizedQuery)];

  if (category) {
    conditions.push(eq(assets.category, category.toLowerCase()));
  }

  const results = await db
    .select({
      id: assets.id,
      rawName: assets.rawName,
      normalizedName: assets.normalizedName,
      category: assets.category,
      latestVersion: assets.latestVersion,
    })
    .from(assets)
    .where(and(...conditions))
    .limit(1);

  if (results.length === 0) return null;

  return {
    ...results[0],
    similarity: 1.0,
    matchType: 'exact',
  };
}

/**
 * Fuzzy search using pg_trgm similarity.
 * Uses GIN index for performance.
 */
export async function fuzzySearchAssets(
  normalizedQuery: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const { limit = 10, minSimilarity = 0.3, category } = options;

  // Build dynamic query with similarity scoring
  // Note: similarity() returns 0-1 where 1 is identical
  const baseResults = await db
    .select({
      id: assets.id,
      rawName: assets.rawName,
      normalizedName: assets.normalizedName,
      category: assets.category,
      latestVersion: assets.latestVersion,
      similarity: sql<number>`similarity(${assets.normalizedName}, ${normalizedQuery})`,
    })
    .from(assets)
    .where(
      sql`similarity(${assets.normalizedName}, ${normalizedQuery}) > ${minSimilarity}`
    )
    .orderBy(sql`similarity(${assets.normalizedName}, ${normalizedQuery}) DESC`)
    .limit(limit * 2); // Get extra for category filtering

  // Filter by category if specified (done post-query for simplicity)
  let filtered = baseResults;
  if (category) {
    filtered = baseResults.filter(r => r.category === category.toLowerCase());
  }

  return filtered.slice(0, limit).map(r => ({
    ...r,
    matchType: 'fuzzy' as const,
  }));
}

/**
 * Combined search: try exact first, fall back to fuzzy.
 * This is the primary search function to use.
 */
export async function searchAssets(
  normalizedQuery: string,
  options: SearchOptions = {}
): Promise<SearchResponse> {
  // 1. Try exact match first (fast path)
  const exactMatch = await exactSearchAsset(normalizedQuery, options.category);

  if (exactMatch) {
    return {
      results: [exactMatch],
      matchType: 'exact',
      query: normalizedQuery,
      totalFound: 1,
    };
  }

  // 2. Fall back to fuzzy search
  const fuzzyResults = await fuzzySearchAssets(normalizedQuery, options);

  if (fuzzyResults.length > 0) {
    return {
      results: fuzzyResults,
      matchType: 'fuzzy',
      query: normalizedQuery,
      totalFound: fuzzyResults.length,
    };
  }

  // 3. No results
  return {
    results: [],
    matchType: 'none',
    query: normalizedQuery,
    totalFound: 0,
  };
}

/**
 * List assets by category, ordered by most recently updated.
 */
export async function listAssetsByCategory(
  category: string,
  limit: number = 10
): Promise<SearchResult[]> {
  const results = await db
    .select({
      id: assets.id,
      rawName: assets.rawName,
      normalizedName: assets.normalizedName,
      category: assets.category,
      latestVersion: assets.latestVersion,
    })
    .from(assets)
    .where(eq(assets.category, category.toLowerCase()))
    .orderBy(sql`${assets.updatedAt} DESC`)
    .limit(limit);

  return results.map(r => ({
    ...r,
    similarity: 1.0,  // Not a similarity search
    matchType: 'exact' as const,
  }));
}
