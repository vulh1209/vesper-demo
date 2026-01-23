import type { KnownBlock } from '@slack/types';

export function buildErrorBlocks(message: string): KnownBlock[] {
  return [{
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `:warning: ${message}`,
    },
  }];
}
