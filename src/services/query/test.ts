/**
 * Query Service Integration Test
 *
 * Run with: OPENAI_API_KEY=sk-xxx npx tsx src/services/query/test.ts
 *
 * Tests the full query pipeline:
 * 1. Intent extraction (requires OpenAI API)
 * 2. Database search (requires PostgreSQL)
 * 3. Result formatting
 */
import 'dotenv/config';
import { query } from './index.js';

const TEST_QUERIES = [
  // Vietnamese queries
  'Ho Ly moi nhat?',
  'tim boss theme',
  'tat ca animation',
  'lich su character rig',

  // English queries
  'Show me all sounds',
  'Latest version of main menu',
  'Search for UI assets',

  // Edge cases
  'gibberish query that makes no sense',
  '',  // Empty query
];

async function runTests() {
  console.log('Query Service Integration Test\n');
  console.log('='.repeat(60));

  for (const testQuery of TEST_QUERIES) {
    console.log(`\nQuery: "${testQuery}"`);
    console.log('-'.repeat(40));

    try {
      const result = await query(testQuery);

      console.log(`Intent: ${result.intent.intent}`);
      console.log(`Asset: ${result.intent.assetName ?? '(none)'}`);
      console.log(`Category: ${result.intent.category ?? '(none)'}`);
      console.log(`Confidence: ${result.intent.confidence}`);
      console.log(`Message: ${result.message}`);
      console.log(`Results: ${result.data.length} item(s)`);
      console.log(`Time: ${result.processingTimeMs}ms`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`ERROR: ${errorMessage}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Tests complete');
}

// Run if executed directly
runTests().catch(console.error);
