import { app } from '../app.js';
import {
  findAssetByName,
  getAssetDetail,
  searchAssets,
} from '../../services/query/index.js';
import {
  buildAssetResultBlocks,
  buildSearchResultsBlocks,
  buildWelcomeBlocks,
} from '../views/index.js';
import type { GenericMessageEvent } from '@slack/types';

app.message(async ({ message, say }) => {
  // Type assertion for proper typing
  const msg = message as GenericMessageEvent;

  // Guard 1: Only handle DMs
  if (msg.channel_type !== 'im') {
    return;
  }

  // Guard 2: Ignore bot messages (prevent loops)
  if (msg.bot_id) {
    return;
  }

  // Guard 3: Ignore message subtypes (edits, deletes, etc.)
  if (msg.subtype !== undefined) {
    return;
  }

  const text = msg.text?.trim();

  // Empty message - show help
  if (!text) {
    await say({ blocks: buildWelcomeBlocks() });
    return;
  }

  try {
    // Try exact match first
    const basicAsset = await findAssetByName(text);

    if (basicAsset) {
      // Get full details with version history
      const asset = await getAssetDetail(basicAsset.id);
      if (asset) {
        await say({ blocks: buildAssetResultBlocks(asset) });
        return;
      }
    }

    // Search fallback
    const { results } = await searchAssets({ query: text, limit: 5 });

    if (results.length === 0) {
      await say({
        text: `I couldn't find any assets matching "${text}". Try a different name or check the web dashboard.`,
      });
      return;
    }

    await say({ blocks: buildSearchResultsBlocks(results, text) });
  } catch (error) {
    console.error('DM error:', error);
    await say({
      text: 'Sorry, something went wrong. Please try again.',
    });
  }
});
