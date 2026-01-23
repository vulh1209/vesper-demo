import 'dotenv/config';
import { testConnection, scrapeChannel } from './scraper.js';
import { slackClient } from './client.js';

async function main() {
  console.log('Testing Slack connection...\n');

  // Test basic connection
  const { ok, channels } = await testConnection();

  if (!ok) {
    console.error('Connection failed. Check your SLACK_BOT_TOKEN.');
    process.exit(1);
  }

  console.log(`\nConnection successful! Found ${channels} accessible channels.\n`);

  // List some channels
  console.log('Listing public channels:');
  const result = await slackClient.conversations.list({
    types: 'public_channel',
    limit: 5,
  });

  for (const channel of result.channels ?? []) {
    console.log(`  - ${channel.name} (${channel.id})`);
  }

  // If a test channel is provided, try scraping it
  const testChannelId = process.argv[2];
  if (testChannelId) {
    console.log(`\nTesting scrape on channel ${testChannelId}...`);
    try {
      const scrapeResult = await scrapeChannel(testChannelId, null);
      console.log(`  Fetched ${scrapeResult.totalFetched} messages`);
      console.log(`  Newest ts: ${scrapeResult.newestTs}`);
      console.log(`  Oldest ts: ${scrapeResult.oldestTs}`);

      // Show sample messages
      if (scrapeResult.messages.length > 0) {
        console.log('\n  Sample messages:');
        for (const msg of scrapeResult.messages.slice(0, 3)) {
          const preview = msg.text?.substring(0, 60) || '(no text)';
          console.log(`    [${msg.ts}] ${preview}...`);
        }
      }
    } catch (error: any) {
      console.error(`  Scrape failed: ${error.message}`);
    }
  } else {
    console.log('\nTip: Run with channel ID to test scraping:');
    console.log('  npm run slack:test C1234567890');
  }
}

main().catch(console.error);
