import { normalizeVietnamese } from './normalizer.js';
import type { ExtractedVersion } from '../version/types.js';

/**
 * Version extraction patterns
 *
 * Ordered by specificity - more specific patterns first.
 * Named capture groups: `asset` and `version`
 */
export const VERSION_PATTERNS: Array<{
  name: string;
  pattern: RegExp;
  confidence: 'high' | 'medium' | 'low';
}> = [
  // Pattern 1: "Ho Ly v3" or "ho_ly_v3" (most common)
  {
    name: 'v-prefix',
    pattern: /(?<asset>[\p{L}\p{N}\s_\-]+?)\s*[_\-\s]*v(?<version>\d+(?:\.\d+)?)/iu,
    confidence: 'high',
  },
  // Pattern 2: "Ho Ly Version 3" or "Ho Ly ver 3"
  {
    name: 'version-word',
    pattern: /(?<asset>[\p{L}\p{N}\s_\-]+?)\s+ver(?:sion)?\s+(?<version>\d+(?:\.\d+)?)/iu,
    confidence: 'high',
  },
  // Pattern 3: "character_rig_v14_final" (asset name with underscores)
  {
    name: 'underscore-v',
    pattern: /(?<asset>[\p{L}\p{N}_]+)_v(?<version>\d+(?:\.\d+)?)/iu,
    confidence: 'high',
  },
  // Pattern 4: "asset #3" or "asset #v3"
  {
    name: 'hash-version',
    pattern: /(?<asset>[\p{L}\p{N}\s_\-]+?)\s*#v?(?<version>\d+(?:\.\d+)?)/iu,
    confidence: 'medium',
  },
  // Pattern 5: "asset (v3)" or "asset (version 3)"
  {
    name: 'parentheses',
    pattern: /(?<asset>[\p{L}\p{N}\s_\-]+?)\s*\(v(?:ersion)?\s*(?<version>\d+(?:\.\d+)?)\)/iu,
    confidence: 'medium',
  },
];

/**
 * Extract version information from message text
 *
 * @param text - Slack message text
 * @returns Extracted version info, or null if no version found
 *
 * @example
 * extractVersion("Ho Ly v3 is done!") // { rawAssetName: "Ho Ly", version: "3", ... }
 * extractVersion("Updated ho_ly_v3") // { rawAssetName: "ho_ly", version: "3", ... }
 * extractVersion("Random message") // null
 */
export function extractVersion(text: string): ExtractedVersion | null {
  // Skip very short messages
  if (!text || text.length < 3) {
    return null;
  }

  // Try each pattern in order
  for (const { name, pattern, confidence } of VERSION_PATTERNS) {
    const match = text.match(pattern);

    if (match?.groups?.asset && match?.groups?.version) {
      const rawAssetName = match.groups.asset.trim();

      // Skip if asset name is too short or just numbers
      if (rawAssetName.length < 2 || /^\d+$/.test(rawAssetName)) {
        continue;
      }

      return {
        rawAssetName,
        normalizedAssetName: normalizeVietnamese(rawAssetName),
        version: match.groups.version,
        confidence,
        matchedPattern: name,
      };
    }
  }

  return null;
}

/**
 * Extract ALL versions from a message (may have multiple)
 *
 * @param text - Slack message text
 * @returns Array of extracted versions (may be empty)
 */
export function extractAllVersions(text: string): ExtractedVersion[] {
  const results: ExtractedVersion[] = [];
  const seenNormalized = new Set<string>();

  // Split by common delimiters that might separate multiple asset mentions
  const segments = text.split(/[,;]|\band\b/i);

  for (const segment of segments) {
    const extracted = extractVersion(segment.trim());
    if (extracted) {
      // Dedupe by normalized name + version
      const key = `${extracted.normalizedAssetName}:${extracted.version}`;
      if (!seenNormalized.has(key)) {
        seenNormalized.add(key);
        results.push(extracted);
      }
    }
  }

  return results;
}

/**
 * Test helper to check if a message likely contains a version
 */
export function hasVersionMention(text: string): boolean {
  return VERSION_PATTERNS.some(({ pattern }) => pattern.test(text));
}
