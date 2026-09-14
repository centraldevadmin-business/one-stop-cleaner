import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { jsonBodyParser } from './server/json-body-parser.js';
import { initDb, _d1, _nodeDb } from './db/database.js';
import db from './db/database.js';

import authRoutes from './server/routes/auth.js';
import { adminRouter as leadAdminRoutes } from './server/routes/leads.js';
import campaignRoutes from './server/routes/campaigns.js';
import cmsRoutes from './server/routes/cms.js';
import analyticsRoutes from './server/routes/analytics.js';
import contactsRoutes from './server/routes/contacts.js';
import ticketsRoutes from './server/routes/tickets.js';
import { adminRouter as blogAdminRoutes } from './server/routes/blog.js';
import rolesRoutes from './server/routes/roles.js';
import { adminRouter as announcementsAdminRoutes } from './server/routes/announcements.js';
import { adminRouter as legalAdminRoutes } from './server/routes/legal.js';
import { adminRouter as settingsAdminRoutes } from './server/routes/settings.js';

const isWorkersRuntime = typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers';
const __dirname = isWorkersRuntime ? '' : path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.ADMIN_PORT || 4001;
const app = express();

app.use(cors());
app.use(jsonBodyParser());

app.use((req, res, next) => {
  console.log(`[Admin] ${req.method} ${req.path}`);
  next();
});

// Mount only admin/API routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadAdminRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/cms', cmsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/blog', blogAdminRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/announcements', announcementsAdminRoutes);
app.use('/api/legal', legalAdminRoutes);
app.use('/api/settings', settingsAdminRoutes);

// Serve the admin.html on the root of this server
const siteDir = path.join(__dirname, '.');
if (!isWorkersRuntime) {
  app.get('/', (req, res) => res.sendFile(path.join(siteDir, 'admin.html')));
  app.use(express.static(siteDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    const filePath = path.join(siteDir, req.path);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) return res.sendFile(filePath);
    return res.sendFile(path.join(siteDir, 'admin.html'));
  });
}

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal admin server error.', detail: err && err.message ? err.message : String(err) });
});

let server;
const isMain = decodeURIComponent(import.meta.url) === `file://${process.argv[1] || ''}`;
if (isMain) {
  initDb();
  server = app.listen(PORT, () => console.log(`Admin Server running on http://localhost:${PORT}`));
  process.on('exit', () => {
    try { db.close(); } catch { /* ignore */ }
  });
}

export { app, server };
