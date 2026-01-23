import 'dotenv/config';
import { db } from './client.js';
import { up } from './migrations/0002_add_trigram.js';

async function runMigrations() {
  console.log('Running migrations...');
  await up(db as any);
  console.log('Migrations complete');
  process.exit(0);
}

runMigrations().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
