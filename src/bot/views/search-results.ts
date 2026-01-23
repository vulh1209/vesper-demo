import type { AssetQueryResult } from '../../services/query/types.js';
import type { KnownBlock } from '@slack/types';

export function buildSearchResultsBlocks(
  results: AssetQueryResult[],
  query: string
): KnownBlock[] {
  const blocks: KnownBlock[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `Found *${results.length}* assets matching "${query}":`,
      },
    },
    { type: 'divider' },
  ];

  for (const result of results.slice(0, 5)) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${result.name}*\n${result.category || 'Unknown'} | v${result.latestVersion || '?'}`,
      },
    });
  }

  if (results.length > 5) {
    blocks.push({
      type: 'context',
      elements: [{
        type: 'mrkdwn',
        text: `_...and ${results.length - 5} more results. Use the web dashboard for full results._`,
      }],
    });
  }

  return blocks;
}
