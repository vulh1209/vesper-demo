// src/api/routes/index.ts
/**
 * API Route Composition
 *
 * Combines all API route modules under /api prefix.
 */
import { Hono } from 'hono';
import assets from './assets.js';

const api = new Hono();

// Mount asset routes at /assets
api.route('/assets', assets);

export default api;
