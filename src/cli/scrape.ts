#!/usr/bin/env npx tsx
import 'dotenv/config';
import { parseArgs } from 'util';
import { scrapeChannel } from '../services/slack/scraper.js';
import { extractAllVersions } from '../services/asset/parser.js';
import { createOrUpdateVersion } from '../services/version/tracker.js';
import { updateChannelSyncState } from '../config/channels.js';
import { db } from '../db/client.js';
import { slackMessages } from '../db/schema.js';

const { values: args, positionals } = parseArgs({
  options: {
    channel: { type: 'string', short: 'c' },
    full: { type: 'boolean', short: 'f' },
    'dry-run': { type: 'boolean', short: 'd' },
    help: { type: 'boolean', short: 'h' },
  },
  allowPositionals: true,
});

async function main() {
  if (args.help) {
    console.log(`
Vesper Scrape CLI

Usage: npm run cli:scrape -- [options]

Options:
  -c, --channel <id>   Channel ID to scrape (required)
  -f, --full           Full history scrape (ignore last sync timestamp)
  -d, --dry-run        Preview extraction without saving to database
  -h, --help           Show this help

Examples:
  npm run cli:scrape -- -c C1234567890
  npm run cli:scrape -- -c C1234567890 --full
  npm run cli:scrape -- -c C1234567890 --dry-run
`);
    return;
  }

  const channelId = args.channel || positionals[0];
  if (!channelId) {
    console.error('Error: Channel ID required. Use -c or --channel');
    process.exit(1);
  }

  const fullHistory = args.full || false;
  const dryRun = args['dry-run'] || false;

  console.log(`\nScraping channel: ${channelId}`);
  console.log(`Mode: ${fullHistory ? 'full history' : 'incremental'}`);
  console.log(`Dry run: ${dryRun}\n`);

  try {
    // Scrape channel
    const result = await scrapeChannel(channelId, fullHistory ? null : undefined);
    console.log(`Fetched ${result.totalFetched} messages\n`);

    if (result.messages.length === 0) {
      console.log('No new messages found.');
      return;
    }

    // Process messages
    let versionsFound = 0;
    let versionsCreated = 0;

    for (const message of result.messages) {
      if (!message.text) continue;

      const versions = extractAllVersions(message.text);

      for (const extracted of versions) {
        versionsFound++;
        console.log(`Found: "${extracted.rawAssetName}" v${extracted.version} (${extracted.matchedPattern})`);
        console.log(`  Message: ${message.text.substring(0, 80)}...`);
        console.log(`  ts: ${message.ts}`);

        if (!dryRun) {
          // Store raw message
          const messageId = `${channelId}:${message.ts}`;
          await db.insert(slackMessages).values({
            id: messageId,
            channelId,
            messageTs: message.ts,
            userId: message.user || null,
            text: message.text,
            messageData: message,
            createdAt: new Date(),
            updatedAt: new Date(),
          }).onConflictDoNothing();

          // Create version
          const created = await createOrUpdateVersion(
            extracted,
            channelId,
            message.ts,
            message.user || null,
            null,
            message.text
          );

          if (created) {
            versionsCreated++;
            console.log(`  -> Created version entry`);
          } else {
            console.log(`  -> Skipped (duplicate)`);
          }
        }
        console.log('');
      }
    }

    // Update sync state
    if (!dryRun && result.newestTs) {
      await updateChannelSyncState(channelId, result.newestTs);
    }

    console.log(`\nSummary:`);
    console.log(`  Messages processed: ${result.totalFetched}`);
    console.log(`  Versions found: ${versionsFound}`);
    if (!dryRun) {
      console.log(`  Versions created: ${versionsCreated}`);
    }

  } catch (error: unknown) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
