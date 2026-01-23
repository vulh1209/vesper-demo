// src/api/server.ts
/**
 * Hono API Server
 *
 * Main entry point for the HTTP API.
 * Serves asset search and detail endpoints for dashboard and Slack bot.
 *
 * Usage:
 *   npm run api              # Start server on port 3001
 *   PORT=8080 npm run api    # Start on custom port
 */
import { serve as honoServe } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import api from './routes/index.js';

// Load environment variables
import 'dotenv/config';

export const app = new Hono();

// Middleware
app.use('*', logger());
app.use('/api/*', cors());

// Mount API routes
app.route('/api', api);

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Root redirect to health
app.get('/', (c) => c.redirect('/health'));

/**
 * Start the server
 *
 * @param port - Port to listen on (default: 3001 or PORT env var)
 */
export function serve(port = parseInt(process.env.PORT || '3001', 10)) {
  console.log(`API server starting on port ${port}...`);

  honoServe({
    fetch: app.fetch,
    port,
  });

  console.log(`API server running at http://localhost:${port}`);
  console.log('Available endpoints:');
  console.log('  GET /health                - Health check');
  console.log('  GET /api/assets/search     - Search assets');
  console.log('  GET /api/assets/:id        - Get asset detail');

  return app;
}

// Start server if run directly
if (process.argv[1]?.includes('server')) {
  serve();
}
