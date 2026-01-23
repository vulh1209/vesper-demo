// tests/integration/setup.ts
/**
 * Test Setup and Fixtures for Integration Tests
 *
 * Provides mock data and helpers for cross-interface consistency tests.
 */
import type { AssetQueryResult, AssetDetailResult } from '../../src/services/query/types.js';

/**
 * Mock asset data for testing consistency
 * These represent typical assets that would be queried through both interfaces
 */
export const mockAssets: AssetQueryResult[] = [
  {
    id: 'asset-1',
    name: 'Ho Ly',
    normalizedName: 'ho ly',
    category: 'sound',
    latestVersion: '3',
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'asset-2',
    name: 'Boss Theme',
    normalizedName: 'boss theme',
    category: 'sound',
    latestVersion: '2',
    updatedAt: new Date('2024-01-10'),
  },
  {
    id: 'asset-3',
    name: 'Ho Ly Animation',
    normalizedName: 'ho ly animation',
    category: 'animation',
    latestVersion: '1',
    updatedAt: new Date('2024-01-05'),
  },
];

/**
 * Mock asset detail with version history
 * Represents the full detail view of an asset with all versions
 */
export const mockAssetDetail: AssetDetailResult = {
  ...mockAssets[0],
  versions: [
    {
      version: '3',
      author: 'U123',
      authorName: 'Nguyen Van A',
      createdAt: new Date('2024-01-15'),
      slackPermalink: 'https://workspace.slack.com/archives/C123/p123',
    },
    {
      version: '2',
      author: 'U124',
      authorName: 'Tran Van B',
      createdAt: new Date('2024-01-10'),
      slackPermalink: 'https://workspace.slack.com/archives/C123/p122',
    },
    {
      version: '1',
      author: 'U123',
      authorName: 'Nguyen Van A',
      createdAt: new Date('2024-01-01'),
      slackPermalink: null,
    },
  ],
};

/**
 * Helper to normalize response for comparison
 *
 * Converts Date objects to ISO strings and recursively normalizes
 * nested objects/arrays for consistent comparison across interfaces.
 *
 * @param obj - Object to normalize
 * @returns Normalized object with dates as ISO strings
 */
export function normalizeForComparison(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map(normalizeForComparison);
  if (typeof obj === 'object') {
    const normalized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      normalized[key] = normalizeForComparison(value);
    }
    return normalized;
  }
  return obj;
}

/**
 * Additional mock assets for category filtering tests
 */
export const mockSoundAssets = mockAssets.filter((a) => a.category === 'sound');
export const mockAnimationAssets = mockAssets.filter((a) => a.category === 'animation');
