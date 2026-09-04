import { Router } from 'express';
import db from '../../db/database.js';

const router = Router();

const byId = (id) => db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);

// List campaigns
router.get('/', (req, res) => {
  const { status, channel } = req.query;
  let sql = 'SELECT * FROM campaigns WHERE 1=1';
  const params = [];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (channel) { sql += ' AND channel = ?'; params.push(channel); }
  sql += ' ORDER BY rowid DESC';
  res.json(db.prepare(sql).all(...params));
});

// Create campaign
router.post('/', (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.channel) return res.status(400).json({ error: 'name and channel required.' });
  const info = db.prepare(`
    INSERT INTO campaigns (name, channel, audience, status, subject, body, scheduled_at)
    VALUES (@name, @channel, @audience, @status, @subject, @body, @scheduled_at)
  `).run({
    name: b.name,
    channel: b.channel,
    audience: b.audience || 'all',
    status: b.status || 'draft',
    subject: b.subject || null,
    body: b.body || null,
    scheduled_at: b.scheduled_at || null
  });
  res.status(201).json({ id: info.lastInsertRowid });
});

// Get one
router.get('/:id', (req, res) => {
  const campaign = byId(req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found.' });
  const stats = db.prepare('SELECT * FROM campaign_stats WHERE campaign_id = ? ORDER BY rowid').all(req.params.id);
  res.json({ ...campaign, stats });
});

// Update campaign
router.put('/:id', (req, res) => {
  const campaign = byId(req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found.' });
  const b = req.body || {};
  const fields = [];
  const params = [];
  for (const key of ['name', 'channel', 'audience', 'status', 'subject', 'body', 'scheduled_at']) {
    if (b[key] !== undefined) { fields.push(`${key} = ?`); params.push(b[key]); }
  }
  if (!fields.length) return res.status(400).json({ error: 'No updatable fields.' });
  params.push(req.params.id);
  db.prepare(`UPDATE campaigns SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  res.json(byId(req.params.id));
});

// Delete campaign
router.delete('/:id', (req, res) => {
  const campaign = byId(req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found.' });
  db.prepare('DELETE FROM campaigns WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Send campaign — resolves recipients by audience, records sent events
router.post('/:id/send', (req, res) => {
  const campaign = byId(req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found.' });

  // Resolve recipients by audience
  let recipients = 0;
  if (campaign.audience === 'all' || campaign.audience === 'waitlist') {
    recipients += db.prepare("SELECT COUNT(*) c FROM leads WHERE source = 'waitlist'").get().c;
  }
  if (campaign.audience === 'all' || campaign.audience === 'service') {
    recipients += db.prepare("SELECT COUNT(*) c FROM leads WHERE source = 'service'").get().c;
  }
  if (campaign.audience === 'all' || campaign.audience === 'partner') {
    recipients += db.prepare("SELECT COUNT(*) c FROM leads WHERE source = 'partner'").get().c;
  }
  if (campaign.audience === 'all') {
    recipients += db.prepare("SELECT COUNT(*) c FROM leads WHERE source IN ('contact','product')").get().c;
  }

  db.prepare("UPDATE campaigns SET recipients = ?, status = 'running', sent_at = datetime('now') WHERE id = ?")
    .run(recipients, req.params.id);
  db.prepare("INSERT INTO campaign_stats (campaign_id, event, count) VALUES (?, 'sent', ?)").run(req.params.id, recipients);

  res.json({ ok: true, recipients, status: 'running' });
});

export default router;
