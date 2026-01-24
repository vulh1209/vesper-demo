// src/api/routes/index.ts
/**
 * API Route Composition
 *
 * Combines all API route modules under /api prefix.
 */
import { Hono } from 'hono';
import assets from './assets.js';
import channels from './admin/channels.js';
import jobs from './admin/jobs.js';
import { queueDashboard } from './queue-dashboard.js';

const api = new Hono();

// Mount asset routes at /assets
api.route('/assets', assets);

// Admin routes
api.route('/admin/channels', channels);
api.route('/admin/jobs', jobs);

// Bull-board dashboard (serves its own UI)
api.route('/admin/queues', queueDashboard);

export default api;
