import 'dotenv/config';
import { db } from './client';
import { channels, assets, assetVersions, slackMessages } from './schema';
import { sql } from 'drizzle-orm';

async function verify() {
  console.log('Verifying database connection and schema...\n');

  try {
    // Test connection
    const result = await db.execute(sql`SELECT 1 as connected`);
    console.log('Database connection: OK');

    // Verify tables exist by counting rows (will be 0 but proves table exists)
    const channelCount = await db.select().from(channels);
    console.log(`Table 'channels': OK (${channelCount.length} rows)`);

    const assetCount = await db.select().from(assets);
    console.log(`Table 'assets': OK (${assetCount.length} rows)`);

    const versionCount = await db.select().from(assetVersions);
    console.log(`Table 'asset_versions': OK (${versionCount.length} rows)`);

    const messageCount = await db.select().from(slackMessages);
    console.log(`Table 'slack_messages': OK (${messageCount.length} rows)`);

    console.log('\nAll verifications passed!');
    process.exit(0);
  } catch (error) {
    console.error('Verification failed:', error);
    process.exit(1);
  }
}

verify();
