import { db } from '../../db/client.js';
import { assets, assetVersions } from '../../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import type { ExtractedVersion, VersionEntry, AssetWithHistory } from './types.js';
import { constructPermalink } from '../slack/client.js';

/**
 * Create or update a version entry from extracted version data
 *
 * Flow:
 * 1. Find or create asset by normalized name
 * 2. Create version entry linked to asset
 * 3. Update asset's latestVersion if this is newer
 *
 * @returns The created version entry, or null if duplicate
 */
export async function createOrUpdateVersion(
  extracted: ExtractedVersion,
  slackChannelId: string,
  slackMessageTs: string,
  author: string | null,
  authorName: string | null,
  rawMessage: string | null
): Promise<VersionEntry | null> {
  const now = new Date();

  // 1. Find or create asset
  let [asset] = await db
    .select()
    .from(assets)
    .where(eq(assets.normalizedName, extracted.normalizedAssetName));

  if (!asset) {
    // Create new asset
    const assetId = randomUUID();
    [asset] = await db
      .insert(assets)
      .values({
        id: assetId,
        rawName: extracted.rawAssetName,
        normalizedName: extracted.normalizedAssetName,
        category: null,  // Will be set based on channel or AI in Phase 2
        latestVersion: null,
        latestVersionId: null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    console.log(`[tracker] Created new asset: ${extracted.rawAssetName} (${asset.id})`);
  }

  // 2. Create version entry
  const versionId = randomUUID();
  const permalink = constructPermalink(slackChannelId, slackMessageTs);

  try {
    const [version] = await db
      .insert(assetVersions)
      .values({
        id: versionId,
        assetId: asset.id,
        version: extracted.version,
        author,
        authorName,
        slackChannelId,
        slackMessageTs,
        slackPermalink: permalink || null,
        rawMessage,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    console.log(`[tracker] Created version ${extracted.version} for asset ${asset.rawName}`);

    // 3. Update asset's latest version
    // Simple heuristic: higher version number = newer
    const shouldUpdateLatest = !asset.latestVersion ||
      compareVersions(extracted.version, asset.latestVersion) > 0;

    if (shouldUpdateLatest) {
      await db
        .update(assets)
        .set({
          latestVersion: extracted.version,
          latestVersionId: versionId,
          updatedAt: now,
        })
        .where(eq(assets.id, asset.id));

      console.log(`[tracker] Updated latest version for ${asset.rawName} to ${extracted.version}`);
    }

    return {
      id: version.id,
      assetId: version.assetId,
      version: version.version,
      author: version.author,
      authorName: version.authorName,
      slackChannelId: version.slackChannelId,
      slackMessageTs: version.slackMessageTs,
      slackPermalink: version.slackPermalink,
      rawMessage: version.rawMessage,
      createdAt: version.createdAt,
    };
  } catch (error: unknown) {
    // Handle duplicate (same channel + ts + asset)
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      console.log(`[tracker] Duplicate version entry, skipping`);
      return null;
    }
    throw error;
  }
}

/**
 * Get version history for an asset
 *
 * @param assetId - Asset UUID
 * @returns Asset with all versions, ordered by creation date desc
 */
export async function getAssetVersionHistory(assetId: string): Promise<AssetWithHistory | null> {
  const [asset] = await db
    .select()
    .from(assets)
    .where(eq(assets.id, assetId));

  if (!asset) {
    return null;
  }

  const versions = await db
    .select()
    .from(assetVersions)
    .where(eq(assetVersions.assetId, assetId))
    .orderBy(desc(assetVersions.createdAt));

  return {
    id: asset.id,
    rawName: asset.rawName,
    normalizedName: asset.normalizedName,
    category: asset.category,
    latestVersion: asset.latestVersion,
    versions: versions.map(v => ({
      id: v.id,
      assetId: v.assetId,
      version: v.version,
      author: v.author,
      authorName: v.authorName,
      slackChannelId: v.slackChannelId,
      slackMessageTs: v.slackMessageTs,
      slackPermalink: v.slackPermalink,
      rawMessage: v.rawMessage,
      createdAt: v.createdAt,
    })),
  };
}

/**
 * Get version history by asset name (normalized lookup)
 */
export async function getAssetVersionHistoryByName(
  assetName: string
): Promise<AssetWithHistory | null> {
  const { normalizeVietnamese } = await import('../asset/normalizer.js');
  const normalizedName = normalizeVietnamese(assetName);

  const [asset] = await db
    .select()
    .from(assets)
    .where(eq(assets.normalizedName, normalizedName));

  if (!asset) {
    return null;
  }

  return getAssetVersionHistory(asset.id);
}

/**
 * Compare two version strings
 *
 * @returns positive if v1 > v2, negative if v1 < v2, 0 if equal
 */
function compareVersions(v1: string, v2: string): number {
  // Handle numeric versions: "3" vs "2"
  const n1 = parseFloat(v1);
  const n2 = parseFloat(v2);

  if (!isNaN(n1) && !isNaN(n2)) {
    return n1 - n2;
  }

  // Fall back to string comparison for non-numeric ("final", "beta")
  return v1.localeCompare(v2);
}

/**
 * Get all assets (for listing)
 */
export async function getAllAssets(): Promise<Array<{
  id: string;
  rawName: string;
  normalizedName: string;
  category: string | null;
  latestVersion: string | null;
  versionCount: number;
}>> {
  const allAssets = await db
    .select()
    .from(assets)
    .orderBy(desc(assets.updatedAt));

  // Get version counts (could be optimized with a join/subquery)
  const results = await Promise.all(
    allAssets.map(async (asset) => {
      const versions = await db
        .select()
        .from(assetVersions)
        .where(eq(assetVersions.assetId, asset.id));

      return {
        id: asset.id,
        rawName: asset.rawName,
        normalizedName: asset.normalizedName,
        category: asset.category,
        latestVersion: asset.latestVersion,
        versionCount: versions.length,
      };
    })
  );

  return results;
}
