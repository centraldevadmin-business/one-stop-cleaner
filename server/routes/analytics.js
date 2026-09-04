import { Router } from 'express';
import db from '../../db/database.js';

const router = Router();

// Record an event (public — called from the frontend)
router.post('/track', (req, res) => {
  const b = req.body || {};
  if (!b.event_name) return res.status(400).json({ error: 'event_name required.' });
  const info = db.prepare(
    'INSERT INTO analytics_events (event_name, page, value) VALUES (?, ?, ?)'
  ).run(b.event_name, b.page || null, Number(b.value) || 0);
  res.status(201).json({ id: info.lastInsertRowid });
});

// Dashboard stats
router.get('/dashboard', (req, res) => {
  const leads = db.prepare('SELECT COUNT(*) c FROM leads').get().c;
  const newLeads = db.prepare("SELECT COUNT(*) c FROM leads WHERE status = 'new'").get().c;
  const campaigns = db.prepare('SELECT COUNT(*) c FROM campaigns').get().c;
  const running = db.prepare("SELECT COUNT(*) c FROM campaigns WHERE status = 'running'").get().c;
  const products = db.prepare('SELECT COUNT(*) c FROM products WHERE active = 1').get().c;
  const signups = db.prepare("SELECT COUNT(*) c FROM analytics_events WHERE event_name = 'waitlist_signup'").get().c;
  const partners = db.prepare("SELECT COUNT(*) c FROM leads WHERE source = 'partner'").get().c;

  // Campaign totals
  const sent = db.prepare("SELECT COALESCE(SUM(count),0) c FROM campaign_stats WHERE event = 'sent'").get().c;
  const opened = db.prepare("SELECT COALESCE(SUM(count),0) c FROM campaign_stats WHERE event = 'opened'").get().c;
  const clicked = db.prepare("SELECT COALESCE(SUM(count),0) c FROM campaign_stats WHERE event = 'clicked'").get().c;

  // Leads by status
  const byStatus = db.prepare('SELECT status, COUNT(*) c FROM leads GROUP BY status').all();
  const byStage = db.prepare('SELECT stage, COUNT(*) c FROM leads GROUP BY stage').all();
  const bySource = db.prepare('SELECT source, COUNT(*) c FROM leads GROUP BY source').all();

  // Top events
  const topEvents = db.prepare('SELECT event_name, COUNT(*) c FROM analytics_events GROUP BY event_name ORDER BY c DESC LIMIT 5').all();

  res.json({
    leads, newLeads, campaigns, running, products, signups, partners,
    sent, opened, clicked,
    byStatus, byStage, bySource, topEvents
  });
});

export default router;
