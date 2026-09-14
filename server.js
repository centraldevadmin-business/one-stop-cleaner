import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { jsonBodyParser } from './server/json-body-parser.js';
import { leadRateLimiter } from './server/lazy-rate-limit.js';
import { initDb, _d1, _nodeDb } from './db/database.js';
import db from './db/database.js';
import { authRequired } from './server/auth.js';

import authRoutes from './server/routes/auth.js';
import { publicRouter as leadPublicRoutes, adminRouter as leadAdminRoutes } from './server/routes/leads.js';
import campaignRoutes from './server/routes/campaigns.js';
import cmsRoutes from './server/routes/cms.js';
import analyticsRoutes from './server/routes/analytics.js';
import contactsRoutes from './server/routes/contacts.js';
import ticketsRoutes from './server/routes/tickets.js';
import { adminRouter as settingsAdminRoutes } from './server/routes/settings.js';
import { publicRouter as blogPublicRoutes, adminRouter as blogAdminRoutes } from './server/routes/blog.js';
import rolesRoutes from './server/routes/roles.js';
import { publicRouter as legalPublicRoutes, adminRouter as legalAdminRoutes } from './server/routes/legal.js';
import { publicRouter as announcementsPublicRoutes, adminRouter as announcementsAdminRoutes } from './server/routes/announcements.js';
import { requireRole, checkPermission } from './server/auth.js';

// `import.meta.url` is undefined on Cloudflare Workers, so guard it. On
// Workers we don't need __dirname (static files come from the assets binding).
const isWorkersRuntime =
  typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers';
const __dirname = isWorkersRuntime
  ? ''
  : path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(jsonBodyParser());

// Maintenance Mode Middleware
app.use(async (req, res, next) => {
  try {
    // We only check for the public site server. Admin runs on admin-server.js.
    const row = await db.prepare("SELECT value FROM settings WHERE key = 'maintenance_mode'").get();
    if (row && row.value === 'true') {
      return res.status(503).send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Site in Maintenance</title>
  <style>
    body { margin: 0; height: 100vh; display: flex; justify-content: center; align-items: center; background: #0f172a; color: #fff; font-family: system-ui, -apple-system, sans-serif; text-align: center; overflow: hidden; }
    .container { padding: 40px; animation: fadeIn 1.5s ease-out; }
    h1 { font-size: 2.5rem; margin-bottom: 20px; font-weight: 800; background: linear-gradient(135deg, #4ade80, #0d9488); -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: pulse 2s infinite ease-in-out; }
    p { font-size: 1.2rem; color: #94a3b8; }
    .spinner { margin: 40px auto; width: 50px; height: 50px; border: 4px solid rgba(255, 255, 255, 0.1); border-radius: 50%; border-top-color: #4ade80; animation: spin 1s ease-in-out infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes pulse { 0% { opacity: 0.8; } 50% { opacity: 1; } 100% { opacity: 0.8; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner"></div>
    <h1>Maintenance Mode</h1>
    <p>site is in maintaince thank you for your patients</p>
  </div>
</body>
</html>`);
    }
  } catch (e) {}
  next();
});

// express.static() calls fs.statSync on every request, which is NOT
// implemented on Cloudflare Workers. On Workers, static files are served
// from the assets binding (env.ASSETS.fetch) in worker.js. So only register
// the filesystem-based static middleware in Node (local dev / tests).
if (!isWorkersRuntime) {
  app.use(express.static(path.join(__dirname, 'public')));
}

// Public API routes
app.use('/api/auth', authRoutes);
app.use('/api/analytics', analyticsRoutes);

// Public lead capture (contact/waitlist/partner/product forms) — POST only, no auth
app.use('/api/leads', leadPublicRoutes);

// Rate limit the public lead endpoint to prevent abuse.
// Created lazily (see server/lazy-rate-limit.js) so it doesn't run async I/O
// at module-load time, which Workers forbids in global scope.
app.use('/api/leads', leadRateLimiter);

// Admin lead management (GET/PUT/DELETE) — requires auth + 'leads' permission
app.use('/api/leads', authRequired, checkPermission('leads'), leadAdminRoutes);
app.use('/api/campaigns', authRequired, checkPermission('campaigns'), campaignRoutes);
app.use('/api/cms', authRequired, checkPermission('cms'), cmsRoutes);

// Public legal pages (privacy / terms) — no auth
app.use('/api/legal', legalPublicRoutes);

// Public announcements (shown on the website) — no auth
app.use('/api/announcements', announcementsPublicRoutes);

// Public blog feed (published posts) — no auth
app.use('/api/blog', blogPublicRoutes);
// Admin blog management — requires auth + 'blog' permission
app.use('/api/blog', authRequired, checkPermission('blog'), blogAdminRoutes);

// CRM: contacts (public capture + admin management)
app.use('/api/contacts', contactsRoutes);
app.use('/api/contacts', authRequired, checkPermission('contacts'), contactsRoutes);

// Support tickets (public create + admin management)
app.use('/api/tickets', ticketsRoutes);
app.use('/api/tickets', authRequired, checkPermission('tickets'), ticketsRoutes);

// RBAC: roles + assignments (superadmin only)
app.use('/api/roles', authRequired, requireRole('superadmin'), checkPermission('roles'), rolesRoutes);

// Legal pages + announcements (content editors) — requires auth
app.use('/api/legal', authRequired, checkPermission('legal'), legalAdminRoutes);
app.use('/api/announcements', authRequired, checkPermission('announcements'), announcementsAdminRoutes);

// Settings
app.use('/api/settings', authRequired, requireRole('superadmin'), settingsAdminRoutes);

// Audit logs (superadmin only)
app.get('/api/audit', authRequired, requireRole('superadmin'), async (req, res) => {
  try {
    const { action, actor_role, limit = 200 } = req.query;
    let sql = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];
    if (action) { sql += ' AND action = ?'; params.push(action); }
    if (actor_role) { sql += ' AND actor_role = ?'; params.push(actor_role); }
    sql += ' ORDER BY rowid DESC LIMIT ?';
    params.push(Number(limit) || 200);
    res.json(await db.prepare(sql).all(...params));
  } catch (e) {
    res.status(500).json({ error: 'Could not load audit logs.' });
  }
});

// Serve the static website (the marketing pages + admin dashboard).
//
// On Cloudflare Workers, `fs.*` is NOT implemented, so we must not call
// express.static() with a filesystem path there. Static files are served
// from the assets binding (env.ASSETS.fetch) by worker.js for every
// non-API request, and API routes never need static file serving. So we
// only register express.static in Node (local dev / tests).
const siteDir = path.join(__dirname, '.');
if (!isWorkersRuntime) {
  app.use(express.static(siteDir));
  // Hidden admin dashboard — served at /dashboard, never linked from marketing pages.
  app.get('/dashboard', (req, res) => res.sendFile(path.join(siteDir, 'public', 'dashboard.html')));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    const filePath = path.join(siteDir, req.path);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) return res.sendFile(filePath);
    return res.sendFile(path.join(siteDir, 'index.html'));
  });
}

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Debug: report which backend is active (D1 vs better-sqlite3)
app.get('/api/_debug', (req, res) => {
  res.json({
    isWorkersRuntime: typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers',
    hasD1Binding: !!_d1,
    hasNodeDb: !!_nodeDb,
  });
});

// 404
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error.', detail: err && err.message ? err.message : String(err) });
});

let server;
// Normalize both sides: import.meta.url URL-encodes spaces (%20) while
// process.argv[1] keeps literal spaces, so decode the meta URL before comparing.
const isMain = decodeURIComponent(import.meta.url) === `file://${process.argv[1] || ''}`;
if (isMain) {
  initDb();
  server = app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  process.on('exit', () => {
    try { db.close(); } catch { /* ignore */ }
  });
}

export { app, server };
