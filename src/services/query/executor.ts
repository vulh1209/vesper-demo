// src/services/query/executor.ts
import { extractIntentSafe, type QueryIntent } from './intent.js';
import { search, listByCategory as searchListByCategory } from '../search/index.js';
import {
  getLatestVersion,
  getVersionHistory,
  listByCategory as repoListByCategory,
  type AssetWithVersion,
} from '../asset/repository.js';
import type { SearchResult } from '../search/types.js';

/**
 * Query result types
 */
export type QueryResultType = 'assets' | 'versions' | 'error';

/**
 * Structured query result
 */
export interface QueryResult {
  type: QueryResultType;
  data: AssetWithVersion[] | SearchResult[];
  message: string;
  intent: QueryIntent;
  processingTimeMs: number;
}

/**
 * Execute a natural language query
 *
 * This is the main entry point for the query system.
 * Flow: Query -> Intent Extraction -> Database Operation -> Result
 *
 * @param userQuery - Natural language query in Vietnamese or English
 * @returns Structured result with data and message
 *
 * @example
 * const result = await executeQuery('Ho Ly moi nhat?');
 * // Returns latest version of Ho Ly asset
 *
 * @example
 * const result = await executeQuery('Show me all sounds');
 * // Returns list of sound assets
 */
export async function executeQuery(userQuery: string): Promise<QueryResult> {
  const startTime = Date.now();

  // 1. Extract intent from natural language
  const { intent, processingTimeMs: intentTimeMs } = await extractIntentSafe(userQuery);

  // 2. Execute based on intent type
  let result: QueryResult;

  switch (intent.intent) {
    case 'search':
      result = await handleSearch(intent);
      break;

    case 'latest':
      result = await handleLatest(intent);
      break;

    case 'list_category':
      result = await handleListCategory(intent);
      break;

    case 'version_history':
      result = await handleVersionHistory(intent);
      break;

    case 'unknown':
    default:
      result = {
        type: 'error',
        data: [],
        message: buildUnknownMessage(userQuery),
        intent,
        processingTimeMs: 0,
      };
  }

  // Add total processing time
  result.processingTimeMs = Date.now() - startTime;

  return result;
}

/**
 * Handle search intent - find assets by name
 */
async function handleSearch(intent: QueryIntent): Promise<QueryResult> {
  if (!intent.assetName) {
    return {
      type: 'error',
      data: [],
      message: 'Please specify an asset name to search for.',
      intent,
      processingTimeMs: 0,
    };
  }

  const searchResult = await search(intent.assetName, {
    category: intent.category ?? undefined,
    limit: intent.limit ?? 10,
  });

  if (searchResult.results.length === 0) {
    return {
      type: 'assets',
      data: [],
      message: `No assets found matching "${intent.assetName}"${intent.category ? ` in ${intent.category} category` : ''}.`,
      intent,
      processingTimeMs: 0,
    };
  }

  const matchTypeText = searchResult.matchType === 'exact' ? 'exact match' : 'fuzzy matches';
  return {
    type: 'assets',
    data: searchResult.results,
    message: `Found ${searchResult.results.length} ${matchTypeText} for "${intent.assetName}".`,
    intent,
    processingTimeMs: 0,
  };
}

/**
 * Handle latest intent - get newest version of an asset
 */
async function handleLatest(intent: QueryIntent): Promise<QueryResult> {
  if (!intent.assetName) {
    return {
      type: 'error',
      data: [],
      message: 'Please specify which asset you want the latest version of.',
      intent,
      processingTimeMs: 0,
    };
  }

  const latest = await getLatestVersion(intent.assetName, intent.category);

  if (!latest) {
    // Try fuzzy search as fallback
    const searchResult = await search(intent.assetName, { limit: 3 });

    if (searchResult.results.length > 0) {
      const suggestions = searchResult.results.map(r => r.rawName).join(', ');
      return {
        type: 'error',
        data: [],
        message: `No exact match for "${intent.assetName}". Did you mean: ${suggestions}?`,
        intent,
        processingTimeMs: 0,
      };
    }

    return {
      type: 'error',
      data: [],
      message: `Asset "${intent.assetName}" not found.`,
      intent,
      processingTimeMs: 0,
    };
  }

  return {
    type: 'versions',
    data: [latest],
    message: `Latest version of ${latest.rawName}: v${latest.version}`,
    intent,
    processingTimeMs: 0,
  };
}

/**
 * Handle list_category intent - show all assets in a category
 */
async function handleListCategory(intent: QueryIntent): Promise<QueryResult> {
  if (!intent.category) {
    return {
      type: 'error',
      data: [],
      message: 'Please specify a category: sound, 3d, 2d, animation, ui, or story.',
      intent,
      processingTimeMs: 0,
    };
  }

  const categoryAssets = await repoListByCategory(intent.category, intent.limit ?? 10);

  if (categoryAssets.length === 0) {
    return {
      type: 'assets',
      data: [],
      message: `No assets found in ${intent.category} category.`,
      intent,
      processingTimeMs: 0,
    };
  }

  return {
    type: 'versions',
    data: categoryAssets,
    message: `Found ${categoryAssets.length} assets in ${intent.category} category.`,
    intent,
    processingTimeMs: 0,
  };
}

/**
 * Handle version_history intent - show all versions of an asset
 */
async function handleVersionHistory(intent: QueryIntent): Promise<QueryResult> {
  if (!intent.assetName) {
    return {
      type: 'error',
      data: [],
      message: 'Please specify which asset you want the version history for.',
      intent,
      processingTimeMs: 0,
    };
  }

  const history = await getVersionHistory(intent.assetName);

  if (history.length === 0) {
    return {
      type: 'versions',
      data: [],
      message: `No version history found for "${intent.assetName}".`,
      intent,
      processingTimeMs: 0,
    };
  }

  return {
    type: 'versions',
    data: history,
    message: `Version history for ${history[0].rawName}: ${history.length} version(s)`,
    intent,
    processingTimeMs: 0,
  };
}

/**
 * Build helpful message for unknown queries
 */
function buildUnknownMessage(query: string): string {
  return `I didn't understand "${query}".

Try asking:
- "Ho Ly moi nhat?" - Get latest version
- "Show me all sounds" - List by category
- "Find character rig" - Search by name
- "History of Boss Theme" - Version history`;
}
