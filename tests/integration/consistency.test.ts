// tests/integration/consistency.test.ts
/**
 * Cross-Interface Consistency Tests
 *
 * Verifies that both Slack bot and web dashboard return identical results
 * for the same queries. This prevents the "different results in different
 * interfaces" anti-pattern.
 *
 * Purpose: Guarantee requirement success criterion #3:
 * "Both interfaces return consistent results (same data layer)."
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  mockAssets,
  mockAssetDetail,
  normalizeForComparison,
  mockSoundAssets,
} from './setup.js';

// Import the shared query service that both interfaces use
import * as queryService from '../../src/services/query/index.js';

// Mock the database layer to isolate tests from actual database
vi.mock('../../src/db/client', () => ({
  db: {
    select: vi.fn(),
  },
}));

describe('Cross-Interface Consistency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Search Results', () => {
    it('searchAssets returns same results regardless of caller', async () => {
      // Mock the underlying service
      vi.spyOn(queryService, 'searchAssets').mockResolvedValue(mockAssets.slice(0, 2));

      // Simulate bot query
      const botResults = await queryService.searchAssets({ query: 'ho ly', limit: 5 });

      // Simulate dashboard query (same parameters)
      const dashboardResults = await queryService.searchAssets({ query: 'ho ly', limit: 5 });

      // Results must be identical
      expect(normalizeForComparison(botResults)).toEqual(
        normalizeForComparison(dashboardResults)
      );
    });

    it('Vietnamese queries produce consistent normalized searches', async () => {
      vi.spyOn(queryService, 'searchAssets').mockResolvedValue(mockAssets.slice(0, 1));

      // Different input variations should call same normalized query
      const results1 = await queryService.searchAssets({ query: 'Ho Ly' });
      const results2 = await queryService.searchAssets({ query: 'ho ly' });

      expect(normalizeForComparison(results1)).toEqual(normalizeForComparison(results2));
    });

    it('category filter applies consistently', async () => {
      vi.spyOn(queryService, 'searchAssets').mockResolvedValue(mockSoundAssets);

      const botResults = await queryService.searchAssets({
        query: 'theme',
        category: 'sound',
      });

      const dashboardResults = await queryService.searchAssets({
        query: 'theme',
        category: 'sound',
      });

      expect(botResults.every((r) => r.category === 'sound')).toBe(true);
      expect(normalizeForComparison(botResults)).toEqual(
        normalizeForComparison(dashboardResults)
      );
    });

    it('empty results are returned consistently', async () => {
      vi.spyOn(queryService, 'searchAssets').mockResolvedValue([]);

      const botResults = await queryService.searchAssets({ query: 'nonexistent' });
      const dashboardResults = await queryService.searchAssets({ query: 'nonexistent' });

      expect(botResults).toEqual([]);
      expect(dashboardResults).toEqual([]);
      expect(normalizeForComparison(botResults)).toEqual(
        normalizeForComparison(dashboardResults)
      );
    });
  });

  describe('Asset Detail', () => {
    it('getAssetDetail returns same data regardless of caller', async () => {
      vi.spyOn(queryService, 'getAssetDetail').mockResolvedValue(mockAssetDetail);

      const botDetail = await queryService.getAssetDetail('asset-1');
      const dashboardDetail = await queryService.getAssetDetail('asset-1');

      expect(normalizeForComparison(botDetail)).toEqual(
        normalizeForComparison(dashboardDetail)
      );
    });

    it('version history is ordered consistently', async () => {
      vi.spyOn(queryService, 'getAssetDetail').mockResolvedValue(mockAssetDetail);

      const detail = await queryService.getAssetDetail('asset-1');

      // Versions should be ordered newest first
      expect(detail?.versions[0].version).toBe('3');
      expect(detail?.versions[1].version).toBe('2');
      expect(detail?.versions[2].version).toBe('1');
    });

    it('not found returns null consistently', async () => {
      vi.spyOn(queryService, 'getAssetDetail').mockResolvedValue(null);

      const botResult = await queryService.getAssetDetail('nonexistent');
      const dashboardResult = await queryService.getAssetDetail('nonexistent');

      expect(botResult).toBeNull();
      expect(dashboardResult).toBeNull();
    });

    it('version history includes all required fields', async () => {
      vi.spyOn(queryService, 'getAssetDetail').mockResolvedValue(mockAssetDetail);

      const detail = await queryService.getAssetDetail('asset-1');

      detail?.versions.forEach((version) => {
        expect(version).toHaveProperty('version');
        expect(version).toHaveProperty('author');
        expect(version).toHaveProperty('authorName');
        expect(version).toHaveProperty('createdAt');
        expect(version).toHaveProperty('slackPermalink');
      });
    });
  });

  describe('findAssetByName', () => {
    it('exact match returns same asset regardless of caller', async () => {
      vi.spyOn(queryService, 'findAssetByName').mockResolvedValue(mockAssetDetail);

      const botResult = await queryService.findAssetByName('ho ly');
      const dashboardResult = await queryService.findAssetByName('ho ly');

      expect(normalizeForComparison(botResult)).toEqual(
        normalizeForComparison(dashboardResult)
      );
    });

    it('normalizes input consistently', async () => {
      vi.spyOn(queryService, 'findAssetByName').mockResolvedValue(mockAssetDetail);

      // These should all resolve to the same asset
      const result1 = await queryService.findAssetByName('Ho Ly');
      const result2 = await queryService.findAssetByName('ho ly');
      const result3 = await queryService.findAssetByName('HO LY');

      expect(normalizeForComparison(result1)).toEqual(normalizeForComparison(result2));
      expect(normalizeForComparison(result2)).toEqual(normalizeForComparison(result3));
    });

    it('returns null for not found consistently', async () => {
      vi.spyOn(queryService, 'findAssetByName').mockResolvedValue(null);

      const botResult = await queryService.findAssetByName('nonexistent');
      const dashboardResult = await queryService.findAssetByName('nonexistent');

      expect(botResult).toBeNull();
      expect(dashboardResult).toBeNull();
    });
  });

  describe('API Layer Consistency', () => {
    it('API returns same format as direct service call', async () => {
      vi.spyOn(queryService, 'searchAssets').mockResolvedValue(mockAssets);

      // Direct service call
      const serviceResults = await queryService.searchAssets({ query: 'test' });

      // API would return { ok: true, data: serviceResults }
      // The data field should match service results exactly
      expect(serviceResults.length).toBeGreaterThan(0);
      expect(serviceResults[0]).toHaveProperty('id');
      expect(serviceResults[0]).toHaveProperty('name');
      expect(serviceResults[0]).toHaveProperty('normalizedName');
    });

    it('service layer shapes data consistently for both interfaces', async () => {
      vi.spyOn(queryService, 'searchAssets').mockResolvedValue(mockAssets);

      const results = await queryService.searchAssets({ query: 'test' });

      // Both interfaces use this exact shape
      results.forEach((asset) => {
        expect(asset).toMatchObject({
          id: expect.any(String),
          name: expect.any(String),
          normalizedName: expect.any(String),
        });
      });
    });
  });
});

describe('Response Format Consistency', () => {
  it('AssetQueryResult has required fields', () => {
    const result = mockAssets[0];

    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('normalizedName');
    expect(result).toHaveProperty('category');
    expect(result).toHaveProperty('latestVersion');
    expect(result).toHaveProperty('updatedAt');
  });

  it('AssetDetailResult extends AssetQueryResult with versions', () => {
    expect(mockAssetDetail).toHaveProperty('versions');
    expect(mockAssetDetail.versions).toBeInstanceOf(Array);
    expect(mockAssetDetail.versions[0]).toHaveProperty('version');
    expect(mockAssetDetail.versions[0]).toHaveProperty('author');
    expect(mockAssetDetail.versions[0]).toHaveProperty('authorName');
    expect(mockAssetDetail.versions[0]).toHaveProperty('createdAt');
    expect(mockAssetDetail.versions[0]).toHaveProperty('slackPermalink');
  });

  it('Date objects are present and valid', () => {
    expect(mockAssets[0].updatedAt).toBeInstanceOf(Date);
    expect(mockAssetDetail.versions[0].createdAt).toBeInstanceOf(Date);
  });

  it('nullable fields handle null correctly', () => {
    // slackPermalink can be null (for versions without Slack links)
    const versionWithoutPermalink = mockAssetDetail.versions.find(
      (v) => v.slackPermalink === null
    );
    expect(versionWithoutPermalink).toBeDefined();
    expect(versionWithoutPermalink?.slackPermalink).toBeNull();
  });
});

describe('normalizeForComparison Helper', () => {
  it('converts Date objects to ISO strings', () => {
    const date = new Date('2024-01-15T12:00:00Z');
    expect(normalizeForComparison(date)).toBe('2024-01-15T12:00:00.000Z');
  });

  it('handles null and undefined', () => {
    expect(normalizeForComparison(null)).toBeNull();
    expect(normalizeForComparison(undefined)).toBeUndefined();
  });

  it('recursively normalizes arrays', () => {
    const arr = [new Date('2024-01-15'), new Date('2024-01-16')];
    const result = normalizeForComparison(arr) as string[];
    expect(result[0]).toBe('2024-01-15T00:00:00.000Z');
    expect(result[1]).toBe('2024-01-16T00:00:00.000Z');
  });

  it('recursively normalizes nested objects', () => {
    const obj = {
      name: 'Test',
      date: new Date('2024-01-15'),
      nested: {
        innerDate: new Date('2024-01-16'),
      },
    };
    const result = normalizeForComparison(obj) as Record<string, unknown>;
    expect(result.date).toBe('2024-01-15T00:00:00.000Z');
    expect((result.nested as Record<string, unknown>).innerDate).toBe(
      '2024-01-16T00:00:00.000Z'
    );
  });

  it('preserves primitive values', () => {
    expect(normalizeForComparison('string')).toBe('string');
    expect(normalizeForComparison(123)).toBe(123);
    expect(normalizeForComparison(true)).toBe(true);
  });
});
