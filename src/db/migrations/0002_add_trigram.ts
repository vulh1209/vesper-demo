import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

/**
 * Migration to enable pg_trgm extension for fuzzy text search.
 * Creates GIN indexes on asset names for fast trigram matching.
 */
export async function up(db: PostgresJsDatabase) {
  // Enable pg_trgm extension for fuzzy text search
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);

  // Create GIN index on normalized_name for fast trigram matching
  // This index makes similarity() queries fast even with large datasets
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_assets_normalized_name_trgm
    ON assets USING gin (normalized_name gin_trgm_ops);
  `);

  // Also create index on raw_name for cases where we search original text
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_assets_raw_name_trgm
    ON assets USING gin (raw_name gin_trgm_ops);
  `);

  console.log('pg_trgm extension enabled and indexes created');
}

export async function down(db: PostgresJsDatabase) {
  await db.execute(sql`DROP INDEX IF EXISTS idx_assets_raw_name_trgm;`);
  await db.execute(sql`DROP INDEX IF EXISTS idx_assets_normalized_name_trgm;`);
  // Don't drop extension - might be used elsewhere
}
