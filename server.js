import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { initDb } from './db/database.js';
import { authRequired } from './server/auth.js';

import authRoutes from './server/routes/auth.js';
import { publicRouter as leadPublicRoutes, adminRouter as leadAdminRoutes } from './server/routes/leads.js';
import campaignRoutes from './server/routes/campaigns.js';
import cmsRoutes from './server/routes/cms.js';
import analyticsRoutes from './server/routes/analytics.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Public API routes
app.use('/api/auth', authRoutes);
app.use('/api/analytics', analyticsRoutes);

// Public lead capture (contact/waitlist/partner/product forms) — POST only, no auth
app.use('/api/leads', leadPublicRoutes);

// Rate limit the public lead endpoint to prevent abuse
const leadLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
app.use('/api/leads', leadLimiter);

// Admin lead management (GET/PUT/DELETE) — requires auth
app.use('/api/leads', authRequired, leadAdminRoutes);
app.use('/api/campaigns', authRequired, campaignRoutes);
app.use('/api/cms', authRequired, cmsRoutes);

// Serve the static website (the marketing pages + admin dashboard)
const siteDir = path.join(__dirname, '.');
app.use(express.static(siteDir));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const filePath = path.join(siteDir, req.path);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) return res.sendFile(filePath);
  return res.sendFile(path.join(siteDir, 'index.html'));
});

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// 404
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
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
