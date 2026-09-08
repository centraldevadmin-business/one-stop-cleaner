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
import { publicRouter as blogPublicRoutes, adminRouter as blogAdminRoutes } from './server/routes/blog.js';
import rolesRoutes from './server/routes/roles.js';
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

// Admin lead management (GET/PUT/DELETE) — requires auth
app.use('/api/leads', authRequired, leadAdminRoutes);
app.use('/api/campaigns', authRequired, campaignRoutes);
app.use('/api/cms', authRequired, cmsRoutes);

// Public blog feed (published posts) — no auth
app.use('/api/blog', blogPublicRoutes);
// Admin blog management — requires auth
app.use('/api/blog', blogAdminRoutes);

// CRM: contacts (public capture + admin management)
app.use('/api/contacts', contactsRoutes);
app.use('/api/contacts', authRequired, contactsRoutes);

// Support tickets (public create + admin management)
app.use('/api/tickets', ticketsRoutes);
app.use('/api/tickets', authRequired, ticketsRoutes);

// RBAC: roles + assignments (superadmin only)
app.use('/api/roles', authRequired, requireRole('superadmin'), rolesRoutes);

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
