/**
 * Search result types for asset search service
 */

export interface SearchResult {
  id: string;
  rawName: string;
  normalizedName: string;
  category: string | null;
  latestVersion: string | null;
  slackPermalink: string | null;
  similarity: number;  // 0-1 where 1 is exact match
  matchType: 'exact' | 'fuzzy';
}

export interface SearchOptions {
  limit?: number;
  minSimilarity?: number;  // Default 0.3
  category?: string;  // Filter by category
}

export interface SearchResponse {
  results: SearchResult[];
  matchType: 'exact' | 'fuzzy' | 'none';
  query: string;
  totalFound: number;
}
