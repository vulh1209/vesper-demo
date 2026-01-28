// src/services/query/asset-query.ts
/**
 * Asset Query Service
 *
 * Provides HTTP API-friendly functions for asset search and retrieval.
 * Both Slack bot and web dashboard consume these functions for consistent results.
 *
 * Key design:
 * - All functions return null (not throw) for not-found cases
 * - Vietnamese normalization applied to all input queries
 * - Version history limited to 10 most recent entries
 */

import { eq, desc } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { assets, assetVersions } from '../../db/schema.js';
import { normalizeVietnamese } from '../nlp/normalizer.js';
import { search as fuzzySearch } from '../search/index.js';
import type {
  AssetQueryResult,
  AssetDetailResult,
  SearchParams,
} from './types.js';

/**
 * Search assets by name with fuzzy matching
 *
 * @param params - Search parameters (query, category, limit)
 * @returns Array of matching assets
 *
 * @example
 * const results = await searchAssets({ query: 'ho ly', limit: 10 });
 * console.log(results); // [{ id: '...', name: 'Ho Ly', ... }]
 */
export async function searchAssets(params: SearchParams): Promise<{
  results: AssetQueryResult[];
  matchType: 'exact' | 'fuzzy';
}> {
  const { query, category, limit = 10 } = params;

  // Use existing fuzzy search from Phase 2
  const searchResponse = await fuzzySearch(query, {
    category,
    limit,
  });

  // Map to API response format
  const results: AssetQueryResult[] = searchResponse.results.map(r => ({
    id: r.id,
    name: r.rawName,
    normalizedName: r.normalizedName,
    category: r.category,
    latestVersion: r.latestVersion,
    slackPermalink: r.slackPermalink,
    updatedAt: new Date(), // Not available in search result, use current as placeholder
  }));

  return {
    results,
    matchType: searchResponse.matchType === 'exact' ? 'exact' : 'fuzzy',
  };
}

/**
 * Get asset detail with version history
 *
 * @param assetId - Asset UUID
 * @returns Asset with versions or null if not found
 *
 * @example
 * const detail = await getAssetDetail('uuid-here');
 * console.log(detail?.versions); // [{ version: '3', author: 'U123', ... }]
 */
export async function getAssetDetail(assetId: string): Promise<AssetDetailResult | null> {
  // Get asset by ID
  const assetResults = await db
    .select({
      id: assets.id,
      rawName: assets.rawName,
      normalizedName: assets.normalizedName,
      category: assets.category,
      latestVersion: assets.latestVersion,
      updatedAt: assets.updatedAt,
    })
    .from(assets)
    .where(eq(assets.id, assetId))
    .limit(1);

  if (assetResults.length === 0) {
    return null;
  }

  const asset = assetResults[0];

  // Get version history (limit to 10 most recent)
  const versionResults = await db
    .select({
      version: assetVersions.version,
      author: assetVersions.author,
      authorName: assetVersions.authorName,
      createdAt: assetVersions.createdAt,
      slackPermalink: assetVersions.slackPermalink,
    })
    .from(assetVersions)
    .where(eq(assetVersions.assetId, assetId))
    .orderBy(desc(assetVersions.createdAt))
    .limit(10);

  return {
    id: asset.id,
    name: asset.rawName,
    normalizedName: asset.normalizedName,
    category: asset.category,
    latestVersion: asset.latestVersion,
    slackPermalink: versionResults[0]?.slackPermalink ?? null,
    updatedAt: asset.updatedAt,
    versions: versionResults,
  };
}

/**
 * Find asset by exact normalized name
 *
 * @param name - Asset name (will be normalized)
 * @returns Asset or null if not found
 *
 * @example
 * const asset = await findAssetByName('Ho Ly');
 * console.log(asset?.latestVersion); // '3'
 */
export async function findAssetByName(name: string): Promise<AssetQueryResult | null> {
  const normalized = normalizeVietnamese(name);

  const results = await db
    .select({
      id: assets.id,
      rawName: assets.rawName,
      normalizedName: assets.normalizedName,
      category: assets.category,
      latestVersion: assets.latestVersion,
      updatedAt: assets.updatedAt,
    })
    .from(assets)
    .where(eq(assets.normalizedName, normalized))
    .limit(1);

  if (results.length === 0) {
    return null;
  }

  const asset = results[0];

  // Get permalink from latest version
  const versionResult = await db
    .select({ slackPermalink: assetVersions.slackPermalink })
    .from(assetVersions)
    .where(eq(assetVersions.assetId, asset.id))
    .orderBy(desc(assetVersions.createdAt))
    .limit(1);

  return {
    id: asset.id,
    name: asset.rawName,
    normalizedName: asset.normalizedName,
    category: asset.category,
    latestVersion: asset.latestVersion,
    slackPermalink: versionResult[0]?.slackPermalink ?? null,
    updatedAt: asset.updatedAt,
  };
}
