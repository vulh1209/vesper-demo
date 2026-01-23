#!/usr/bin/env npx tsx
import 'dotenv/config';
import { parseArgs } from 'util';
import { getAllAssets, getAssetVersionHistoryByName } from '../services/version/tracker.js';
import { normalizeVietnamese } from '../services/asset/normalizer.js';

const { values: args, positionals } = parseArgs({
  options: {
    asset: { type: 'string', short: 'a' },
    list: { type: 'boolean', short: 'l' },
    help: { type: 'boolean', short: 'h' },
  },
  allowPositionals: true,
});

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function main() {
  if (args.help) {
    console.log(`
Vesper History CLI

Usage: npm run cli:history -- [options]

Options:
  -a, --asset <name>   Asset name to look up (e.g., "Ho Ly" or "Ho Ly")
  -l, --list           List all tracked assets
  -h, --help           Show this help

Examples:
  npm run cli:history -- --list
  npm run cli:history -- -a "Ho Ly"
  npm run cli:history -- -a "Ho Ly"
`);
    return;
  }

  if (args.list) {
    console.log('\nTracked Assets:\n');

    const assets = await getAllAssets();

    if (assets.length === 0) {
      console.log('No assets tracked yet.');
      return;
    }

    console.log('Name                     | Latest | Versions');
    console.log('-------------------------|--------|----------');

    for (const asset of assets) {
      const name = asset.rawName.padEnd(24).substring(0, 24);
      const version = (asset.latestVersion || '-').padEnd(6);
      console.log(`${name} | ${version} | ${asset.versionCount}`);
    }

    console.log(`\nTotal: ${assets.length} assets`);
    return;
  }

  const assetName = args.asset || positionals[0];
  if (!assetName) {
    console.error('Error: Asset name required. Use -a or --asset, or use --list to see all assets.');
    process.exit(1);
  }

  console.log(`\nLooking up asset: "${assetName}"`);
  console.log(`Normalized: "${normalizeVietnamese(assetName)}"\n`);

  const asset = await getAssetVersionHistoryByName(assetName);

  if (!asset) {
    console.log('Asset not found.');
    return;
  }

  console.log(`Asset: ${asset.rawName}`);
  console.log(`Category: ${asset.category || 'Uncategorized'}`);
  console.log(`Latest Version: ${asset.latestVersion || 'Unknown'}`);
  console.log(`\nVersion History (${asset.versions.length} versions):\n`);

  for (const version of asset.versions) {
    console.log(`  v${version.version} - ${formatDate(version.createdAt)}`);
    if (version.authorName || version.author) {
      console.log(`    Author: ${version.authorName || version.author}`);
    }
    if (version.slackPermalink) {
      console.log(`    Source: ${version.slackPermalink}`);
    } else {
      console.log(`    Source: Channel ${version.slackChannelId}, ts ${version.slackMessageTs}`);
    }
    if (version.rawMessage) {
      const preview = version.rawMessage.substring(0, 60);
      console.log(`    Message: "${preview}${version.rawMessage.length > 60 ? '...' : ''}"`);
    }
    console.log('');
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
