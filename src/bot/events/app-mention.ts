import { app } from '../app.js';
import { findAssetByName, getAssetDetail, searchAssets } from '../../services/query/index.js';
import { buildAssetResultBlocks, buildSearchResultsBlocks } from '../views/index.js';

app.event('app_mention', async ({ event, say }) => {
  // Remove the @mention from the text
  const text = event.text.replace(/<@[A-Z0-9]+>/g, '').trim();

  if (!text) {
    await say({
      thread_ts: event.ts,
      text: 'Hi! Ask me about any asset. For example: "ho ly" or "latest Boss Theme"',
    });
    return;
  }

  try {
    // Try exact match first
    const basicAsset = await findAssetByName(text);

    if (basicAsset) {
      // Get full details with version history
      const asset = await getAssetDetail(basicAsset.id);
      if (asset) {
        await say({
          thread_ts: event.ts,
          blocks: buildAssetResultBlocks(asset),
        });
        return;
      }
    }

    // Search fallback
    const { results } = await searchAssets({ query: text, limit: 5 });

    if (results.length === 0) {
      await say({
        thread_ts: event.ts,
        text: `I couldn't find any assets matching "${text}". Try a different name or check the web dashboard.`,
      });
      return;
    }

    await say({
      thread_ts: event.ts,
      blocks: buildSearchResultsBlocks(results, text),
    });
  } catch (error) {
    console.error('Mention error:', error);
    await say({
      thread_ts: event.ts,
      text: 'Sorry, something went wrong. Please try again.',
    });
  }
});
