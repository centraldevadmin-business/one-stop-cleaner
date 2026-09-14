import { Router } from 'express';
import db from '../../db/database.js';

const router = Router();

// Record an event (public — called from the frontend)
router.post('/track', async (req, res) => {
  const b = req.body || {};
  if (!b.event_name) return res.status(400).json({ error: 'event_name required.' });
  const info = await db.prepare(
    'INSERT INTO analytics_events (event_name, page, value) VALUES (?, ?, ?)'
  ).run(b.event_name, b.page || null, Number(b.value) || 0);
  res.status(201).json({ id: info.lastInsertRowid });
});

// Dashboard stats
router.get('/dashboard', async (req, res) => {
  const leads = (await db.prepare('SELECT COUNT(*) c FROM leads').get()).c;
  const newLeads = (await db.prepare("SELECT COUNT(*) c FROM leads WHERE status = 'new'").get()).c;
  const campaigns = (await db.prepare('SELECT COUNT(*) c FROM campaigns').get()).c;
  const running = (await db.prepare("SELECT COUNT(*) c FROM campaigns WHERE status = 'running'").get()).c;
  const products = (await db.prepare('SELECT COUNT(*) c FROM products WHERE active = 1').get()).c;
  const signups = (await db.prepare("SELECT COUNT(*) c FROM analytics_events WHERE event_name = 'waitlist_signup'").get()).c;
  const partners = (await db.prepare("SELECT COUNT(*) c FROM leads WHERE source = 'partner'").get()).c;
  const contacts = (await db.prepare('SELECT COUNT(*) c FROM contacts').get()).c;
  const openTickets = (await db.prepare("SELECT COUNT(*) c FROM tickets WHERE status IN ('open','in_progress')").get()).c;
  const posts = (await db.prepare('SELECT COUNT(*) c FROM blog_posts').get()).c;

  // Campaign totals
  const sent = (await db.prepare("SELECT COALESCE(SUM(count),0) c FROM campaign_stats WHERE event = 'sent'").get()).c;
  const opened = (await db.prepare("SELECT COALESCE(SUM(count),0) c FROM campaign_stats WHERE event = 'opened'").get()).c;
  const clicked = (await db.prepare("SELECT COALESCE(SUM(count),0) c FROM campaign_stats WHERE event = 'clicked'").get()).c;

  // Leads by status
  const byStatus = await db.prepare('SELECT status, COUNT(*) c FROM leads GROUP BY status').all();
  const byStage = await db.prepare('SELECT stage, COUNT(*) c FROM leads GROUP BY stage').all();
  const bySource = await db.prepare('SELECT source, COUNT(*) c FROM leads GROUP BY source').all();

  // Top events
  const topEvents = await db.prepare('SELECT event_name, COUNT(*) c FROM analytics_events GROUP BY event_name ORDER BY c DESC LIMIT 5').all();

  // Lead conversion funnel (stage order preserved)
  const stageOrder = ['discovery', 'contacted', 'qualified', 'booked', 'completed', 'lost'];
  const stageCounts = (await db.prepare('SELECT stage, COUNT(*) c FROM leads GROUP BY stage').all());
  const funnel = stageOrder.map((s) => ({ stage: s, count: stageCounts.find((x) => x.stage === s)?.c || 0 }));

  // Contacts by status + priority
  const contactsByStatus = await db.prepare('SELECT status, COUNT(*) c FROM contacts GROUP BY status').all();
  const highPriorityContacts = (await db.prepare("SELECT COUNT(*) c FROM contacts WHERE priority IN ('high','urgent') AND status != 'lost'").get()).c;

  // Ticket health
  const resolvedTickets = (await db.prepare("SELECT COUNT(*) c FROM tickets WHERE status IN ('resolved','closed')").get()).c;
  // Average time from ticket creation to first agent reply (hours), from message timestamps.
  const avgResponseHours = (await db.prepare(`
    SELECT AVG(julianday(m.created_at) - julianday(t.created_at)) / 24.0 avg_hours
    FROM ticket_messages m
    JOIN tickets t ON t.id = m.ticket_id
    WHERE m.author_role = 'agent'
  `).get()).avg_hours;
  const ticketResponseHours = avgResponseHours?.avg_hours ? Math.round(avgResponseHours.avg_hours * 10) / 10 : 0;

  // Traffic / events time series (last 7 days)
  const series = [];
  for (let i = 6; i >= 0; i--) {
    const day = await db.prepare(
      "SELECT COUNT(*) c FROM analytics_events WHERE date(created_at) = date('now', ?)"
    ).get(`-${i} days`);
    const d = new Date(Date.now() - i * 86400000);
    series.push({
      day: d.toLocaleDateString(undefined, { weekday: 'short' }),
      date: d.toISOString().slice(0, 10),
      events: day.c,
    });
  }

  // Top landing pages
  const topPages = await db.prepare("SELECT page, COUNT(*) c FROM analytics_events WHERE page IS NOT NULL AND page != '' GROUP BY page ORDER BY c DESC LIMIT 5").all();

  // Conversion rate (signed up / visited) using tracked events
  const visits = (await db.prepare("SELECT COUNT(*) c FROM analytics_events WHERE event_name = 'page_view'").get()).c;
  const signupsCount = signups;
  const conversionRate = visits ? Math.round((signupsCount / visits) * 100) : 0;

  res.json({
    leads, newLeads, campaigns, running, products, signups, partners,
    contacts, openTickets, posts,
    sent, opened, clicked,
    byStatus, byStage, bySource, topEvents,
    funnel, contactsByStatus, highPriorityContacts,
    resolvedTickets, ticketResponseHours, series, topPages,
    visits, conversionRate,
  });
});

// Daily active users / sessions for the last 30 days
router.get('/daily-activity', async (req, res) => {
  const rows = await db.prepare(`
    SELECT date(created_at) d, COUNT(*) c
    FROM analytics_events
    WHERE date(created_at) >= date('now', '-30 days')
    GROUP BY date(created_at)
    ORDER BY date(created_at)
  `).all();
  res.json(rows.map((r) => ({ date: r.d, users: r.c })));
});

// Engagement insights: most active hour, top event, growth since last week
router.get('/insights', async (req, res) => {
  const topEventRow = await db.prepare(
    "SELECT event_name, COUNT(*) c FROM analytics_events GROUP BY event_name ORDER BY c DESC LIMIT 1"
  ).get();

  const topHour = await db.prepare(
    "SELECT CAST(strftime('%H', created_at) AS INTEGER) h, COUNT(*) c FROM analytics_events GROUP BY h ORDER BY c DESC LIMIT 1"
  ).get();

  const thisWeek = (await db.prepare(
    "SELECT COUNT(*) c FROM analytics_events WHERE date(created_at) >= date('now', '-7 days')"
  ).get()).c;
  const lastWeek = (await db.prepare(
    "SELECT COUNT(*) c FROM analytics_events WHERE date(created_at) >= date('now', '-14 days') AND date(created_at) < date('now', '-7 days')"
  ).get()).c;
  const growth = lastWeek ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : 0;

  res.json({
    topEvent: topEventRow?.event_name || '—',
    topEventCount: topEventRow?.c || 0,
    peakHour: topHour ? String(topHour.h).padStart(2, '0') + ':00' : '—',
    weekEvents: thisWeek,
    growth,
  });
});

export default router;
