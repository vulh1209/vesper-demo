import { app } from '../app.js';
import { findAssetByName, getAssetDetail, searchAssets } from '../../services/query/index.js';
import { buildAssetResultBlocks, buildSearchResultsBlocks, buildErrorBlocks } from '../views/index.js';

app.command('/vesper', async ({ command, ack, respond }) => {
  // MUST ack within 3 seconds - do this FIRST
  await ack();

  const query = command.text.trim();

  if (!query) {
    await respond({
      response_type: 'ephemeral',
      blocks: buildErrorBlocks('Please provide an asset name. Example: `/vesper ho ly`'),
    });
    return;
  }

  try {
    // Try exact match first
    const basicAsset = await findAssetByName(query);

    if (basicAsset) {
      // Get full details with version history
      const asset = await getAssetDetail(basicAsset.id);
      if (asset) {
        await respond({
          response_type: 'in_channel',
          blocks: buildAssetResultBlocks(asset),
        });
        return;
      }
    }

    // Fall back to search
    const { results } = await searchAssets({ query, limit: 5 });

    if (results.length === 0) {
      await respond({
        response_type: 'ephemeral',
        text: `No assets found matching "${query}"`,
      });
      return;
    }

    await respond({
      response_type: 'in_channel',
      blocks: buildSearchResultsBlocks(results, query),
    });
  } catch (error) {
    console.error('Command error:', error);
    await respond({
      response_type: 'ephemeral',
      blocks: buildErrorBlocks('Something went wrong. Please try again.'),
    });
  }
});
