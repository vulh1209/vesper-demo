// src/services/asset/repository.ts
import { eq, desc, and } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { assets, assetVersions } from '../../db/schema.js';
import { normalizeVietnamese } from '../nlp/normalizer.js';

/**
 * Asset with version information
 */
export interface AssetWithVersion {
  id: string;
  rawName: string;
  normalizedName: string;
  category: string | null;
  version: string;
  author: string | null;
  authorName: string | null;
  slackPermalink: string | null;
  createdAt: Date;
}

/**
 * Get latest version of an asset by name
 *
 * @param assetName - Asset name (will be normalized)
 * @param category - Optional category filter
 * @returns Latest version info or null if not found
 */
export async function getLatestVersion(
  assetName: string,
  category?: string | null
): Promise<AssetWithVersion | null> {
  const normalized = normalizeVietnamese(assetName);

  // Build conditions
  const conditions = [eq(assets.normalizedName, normalized)];
  if (category) {
    conditions.push(eq(assets.category, category.toLowerCase()));
  }

  // Join assets with their latest version
  const results = await db
    .select({
      id: assets.id,
      rawName: assets.rawName,
      normalizedName: assets.normalizedName,
      category: assets.category,
      version: assetVersions.version,
      author: assetVersions.author,
      authorName: assetVersions.authorName,
      slackPermalink: assetVersions.slackPermalink,
      createdAt: assetVersions.createdAt,
    })
    .from(assets)
    .innerJoin(assetVersions, eq(assets.latestVersionId, assetVersions.id))
    .where(and(...conditions))
    .limit(1);

  return results[0] ?? null;
}

/**
 * Get version history for an asset
 *
 * @param assetName - Asset name (will be normalized)
 * @returns Array of versions ordered by date (newest first)
 */
export async function getVersionHistory(
  assetName: string
): Promise<AssetWithVersion[]> {
  const normalized = normalizeVietnamese(assetName);

  const results = await db
    .select({
      id: assets.id,
      rawName: assets.rawName,
      normalizedName: assets.normalizedName,
      category: assets.category,
      version: assetVersions.version,
      author: assetVersions.author,
      authorName: assetVersions.authorName,
      slackPermalink: assetVersions.slackPermalink,
      createdAt: assetVersions.createdAt,
    })
    .from(assets)
    .innerJoin(assetVersions, eq(assetVersions.assetId, assets.id))
    .where(eq(assets.normalizedName, normalized))
    .orderBy(desc(assetVersions.createdAt));

  return results;
}

/**
 * Get asset by normalized name (exact match)
 *
 * @param assetName - Asset name (will be normalized)
 * @returns Asset record or null
 */
export async function getAssetByName(assetName: string) {
  const normalized = normalizeVietnamese(assetName);

  const results = await db
    .select()
    .from(assets)
    .where(eq(assets.normalizedName, normalized))
    .limit(1);

  return results[0] ?? null;
}

/**
 * List assets by category
 *
 * @param category - Category to filter by
 * @param limit - Maximum results
 * @returns Array of assets with latest version info
 */
export async function listByCategory(
  category: string,
  limit: number = 10
): Promise<AssetWithVersion[]> {
  const results = await db
    .select({
      id: assets.id,
      rawName: assets.rawName,
      normalizedName: assets.normalizedName,
      category: assets.category,
      version: assetVersions.version,
      author: assetVersions.author,
      authorName: assetVersions.authorName,
      slackPermalink: assetVersions.slackPermalink,
      createdAt: assetVersions.createdAt,
    })
    .from(assets)
    .leftJoin(assetVersions, eq(assets.latestVersionId, assetVersions.id))
    .where(eq(assets.category, category.toLowerCase()))
    .orderBy(desc(assets.updatedAt))
    .limit(limit);

  // Filter out nulls from left join and cast
  return results.filter(r => r.version !== null) as AssetWithVersion[];
}
