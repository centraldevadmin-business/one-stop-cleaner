// Cloudflare Workers entry point.
//
// Mounts the Express app for /api/* and serves the static marketing site +
// admin dashboard from the assets binding. The D1 database is initialised once
// per worker instance via init(env).
//
// wrangler.toml must bind:
//   - assets  -> { binding = "ASSETS", directory = "." }
//   - d1_databases.one_stop_cleaner_db -> { database_id = "..." }

import { app } from './server.js';
import { init } from './db/database.js';
import { runExpress } from './server/express-to-workers.js';

let initialised = false;

async function ensureInit(env) {
  if (initialised) return;
  await init(env);
  initialised = true;
}

export default {
  async fetch(request, env, ctx) {
    console.error('WORKER FETCH START:', request.method, request.url);
    try {
      await ensureInit(env);
    } catch (err) {
      console.error('INIT ERROR:', err && err.stack ? err.stack : err);
      return new Response(JSON.stringify({ error: 'Init failed', detail: String(err && err.message || err) }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
    }

    const url = new URL(request.url);

    // API requests are handled by the Express app.
    if (url.pathname.startsWith('/api/')) {
      try {
        return await runExpress(app, request);
      } catch (err) {
        console.error('API ERROR:', err && err.stack ? err.stack : err);
        return new Response(JSON.stringify({ error: 'Internal server error', detail: String(err && err.message || err) }), {
          status: 500,
          headers: { 'content-type': 'application/json' },
        });
      }
    }

    // Everything else is a static asset (marketing pages / admin dashboard).
    // The assets binding returns a 404 HTML page for unknown routes, which we
    // let fall through to the SPA fallback handled by not_found_handling.
    return env.ASSETS.fetch(request);
  },
};
