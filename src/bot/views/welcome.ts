import type { KnownBlock } from '@slack/types';

export function buildWelcomeBlocks(): KnownBlock[] {
  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: 'Welcome to Vesper!',
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: "I help you track asset versions. Just tell me what you're looking for!",
      },
    },
    {
      type: 'divider',
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text:
          '*Try these examples:*\n' +
          '\u2022 `ho ly` - Find the latest version of Ho Ly\n' +
          '\u2022 `boss theme` - Search for Boss Theme assets\n' +
          '\u2022 Just type any asset name!',
      },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: 'Tip: You can also @mention me in channels or use `/vesper` command.',
        },
      ],
    },
  ];
}
