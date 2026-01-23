/**
 * Types for version tracking
 */

// Result of extracting version from a message
export interface ExtractedVersion {
  rawAssetName: string;       // Original name as extracted (e.g., "Ho Ly")
  normalizedAssetName: string; // Normalized for matching (e.g., "ho ly")
  version: string;            // Version string (e.g., "3", "2.1", "final")
  confidence: 'high' | 'medium' | 'low';
  matchedPattern: string;     // Which pattern matched (for debugging)
}

// Database version entry (maps to assetVersions table)
export interface VersionEntry {
  id: string;
  assetId: string;
  version: string;
  author: string | null;
  authorName: string | null;
  slackChannelId: string;
  slackMessageTs: string;
  slackPermalink: string | null;
  rawMessage: string | null;
  createdAt: Date;
}

// Asset with version history
export interface AssetWithHistory {
  id: string;
  rawName: string;
  normalizedName: string;
  category: string | null;
  latestVersion: string | null;
  versions: VersionEntry[];
}
