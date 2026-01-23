import type { AssetDetailResult } from '../../services/query/types.js';
import type { KnownBlock } from '@slack/types';

export function buildAssetResultBlocks(asset: AssetDetailResult): KnownBlock[] {
  const latestVersion = asset.versions[0];

  const blocks: KnownBlock[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: asset.name,
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Category:*\n${asset.category || 'Unknown'}`,
        },
        {
          type: 'mrkdwn',
          text: `*Latest Version:*\n${asset.latestVersion || 'N/A'}`,
        },
      ],
    },
  ];

  if (latestVersion) {
    const section: KnownBlock = {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Last Updated:* ${formatDate(latestVersion.createdAt)}${
          latestVersion.authorName ? ` by ${latestVersion.authorName}` : ''
        }`,
      },
    };

    if (latestVersion.slackPermalink) {
      (section as any).accessory = {
        type: 'button',
        text: { type: 'plain_text', text: 'View in Slack' },
        url: latestVersion.slackPermalink,
        action_id: 'view_slack_message',
      };
    }

    blocks.push(section);
  }

  // Show version history (up to 3)
  if (asset.versions.length > 1) {
    blocks.push({ type: 'divider' });
    blocks.push({
      type: 'context',
      elements: [{
        type: 'mrkdwn',
        text: `*Version History:* ${asset.versions
          .slice(0, 3)
          .map(v => `v${v.version}`)
          .join(' <- ')}${asset.versions.length > 3 ? ' ...' : ''}`,
      }],
    });
  }

  return blocks;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
}
