import { Router } from 'express';
import db from '../../db/database.js';

// Public capture router — only the POST endpoint (contact/waitlist/partner/product forms).
const publicRouter = Router();

// Admin router — read/update/delete (requires authentication).
const adminRouter = Router();

const byId = async (id) => await db.prepare('SELECT * FROM leads WHERE id = ?').get(id);

// Lead scoring: certain sources are worth more to the business right now.
// This sets the priority automatically so investor/partner leads surface first.
const SOURCE_PRIORITY = {
  investor: 'urgent',
  partner: 'high',
  product: 'high',
  service: 'normal',
  cleaner: 'normal',
  waitlist: 'normal',
  contact: 'normal',
};

function scoreLead(body) {
  const source = (body.source || 'contact').toLowerCase();
  // Never downgrade an explicitly-set priority; only auto-fill when unset.
  if (body.priority && ['low', 'normal', 'high', 'urgent'].includes(body.priority)) {
    return body.priority;
  }
  return SOURCE_PRIORITY[source] || 'normal';
}

// List leads (with optional filters) — admin only
adminRouter.get('/', async (req, res) => {
  const { status, stage, source, priority, q, segment } = req.query;
  let sql = 'SELECT * FROM leads WHERE 1=1';
  const params = [];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (stage) { sql += ' AND stage = ?'; params.push(stage); }
  if (source) { sql += ' AND source = ?'; params.push(source); }
  if (priority) { sql += ' AND priority = ?'; params.push(priority); }
  if (segment) { sql += ' AND segment = ?'; params.push(segment); }
  if (q) { sql += ' AND (name LIKE ? OR email LIKE ? OR company LIKE ? OR message LIKE ?)'; const s = `%${q}%`; params.push(s, s, s, s); }
  // High priority first, then newest.
  sql += " ORDER BY CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END, rowid DESC LIMIT 500";
  res.json(await db.prepare(sql).all(...params));
});

// Create lead (admin — from the admin panel) — admin only
adminRouter.post('/', async (req, res) => {
  const b = req.body || {};
  if (!b.name && !b.email) return res.status(400).json({ error: 'name or email required.' });
  const priority = scoreLead(b);
  const info = await db.prepare(`
    INSERT INTO leads (source, status, stage, priority, segment, name, email, phone, company, message, city, service_type, notes)
    VALUES (@source, @status, @stage, @priority, @segment, @name, @email, @phone, @company, @message, @city, @service_type, @notes)
  `).run({
    source: b.source || 'admin',
    status: b.status || 'new',
    stage: b.stage || 'discovery',
    priority,
    segment: b.segment || 'general',
    name: b.name || null,
    email: b.email || null,
    phone: b.phone || null,
    company: b.company || null,
    message: b.message || null,
    city: b.city || null,
    service_type: b.service_type || null,
    notes: b.notes || null
  });
  res.status(201).json(await byId(info.lastInsertRowid));
});

// Create lead (public — from contact/waitlist/partner/product forms)
publicRouter.post('/', async (req, res) => {
  const b = req.body || {};
  const priority = scoreLead(b);
  const info = await db.prepare(`
    INSERT INTO leads (source, status, stage, priority, segment, name, email, phone, company, message, city, service_type, notes)
    VALUES (@source, @status, @stage, @priority, @segment, @name, @email, @phone, @company, @message, @city, @service_type, @notes)
  `).run({
    source: b.source || 'contact',
    status: b.status || 'new',
    stage: b.stage || 'discovery',
    priority,
    segment: b.segment || 'general',
    name: b.name || null,
    email: b.email || null,
    phone: b.phone || null,
    company: b.company || null,
    message: b.message || null,
    city: b.city || null,
    service_type: b.service_type || null,
    notes: b.notes || null
  });
  res.status(201).json({ id: info.lastInsertRowid });
});

// Get one — admin only
adminRouter.get('/:id', async (req, res) => {
  const lead = await byId(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found.' });
  res.json(lead);
});

// Update lead (stage/status/priority/notes/assignee/segment) — admin only
adminRouter.put('/:id', async (req, res) => {
  const lead = await byId(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found.' });
  const b = req.body || {};
  const fields = [];
  const params = [];
  for (const key of ['status', 'stage', 'priority', 'name', 'email', 'phone', 'company', 'message', 'city', 'service_type', 'notes', 'assigned_to', 'segment']) {
    if (b[key] !== undefined) { fields.push(`${key} = ?`); params.push(b[key]); }
  }
  if (!fields.length) return res.status(400).json({ error: 'No updatable fields.' });
  fields.push("updated_at = datetime('now')");
  params.push(req.params.id);
  await db.prepare(`UPDATE leads SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  res.json(await byId(req.params.id));
});

// Bulk update — admin only. Accepts { ids: [...], ...fields } and applies the
// given fields to every lead id. Used for assignee assignment, status changes, etc.
adminRouter.post('/bulk', async (req, res) => {
  const b = req.body || {};
  const ids = Array.isArray(b.ids) ? b.ids : [];
  if (!ids.length) return res.status(400).json({ error: 'No ids provided.' });
  const updatable = ['status', 'stage', 'priority', 'assigned_to', 'segment', 'notes'];
  const changes = {};
  for (const key of updatable) {
    if (b[key] !== undefined) changes[key] = b[key];
  }
  if (!Object.keys(changes).length) return res.status(400).json({ error: 'No updatable fields provided.' });
  const sets = Object.keys(changes).map((k) => `${k} = ?`).join(', ');
  const baseParams = Object.values(changes);
  for (const id of ids) {
    const params = [...baseParams, id];
    await db.prepare(`UPDATE leads SET ${sets}, updated_at = datetime('now') WHERE id = ?`).run(...params);
  }
  const updated = await db.prepare(`SELECT * FROM leads WHERE id IN (${ids.map(() => '?').join(',')})`).all(...ids);
  res.json({ updated: updated.length, leads: updated });
});

// Bulk delete — admin only
adminRouter.post('/bulk-delete', async (req, res) => {
  const b = req.body || {};
  const ids = Array.isArray(b.ids) ? b.ids : [];
  if (!ids.length) return res.status(400).json({ error: 'No ids provided.' });
  for (const id of ids) {
    await db.prepare('DELETE FROM leads WHERE id = ?').run(id);
  }
  res.json({ deleted: ids.length });
});

// Export leads as CSV — admin only
adminRouter.get('/export', async (req, res) => {
  const rows = await db.prepare('SELECT * FROM leads ORDER BY rowid DESC LIMIT 2000').all();
  const columns = ['id', 'source', 'status', 'stage', 'priority', 'segment', 'name', 'email', 'phone', 'company', 'city', 'service_type', 'assigned_to', 'notes', 'created_at'];
  const csvRow = (row) => columns.map((c) => {
    const v = row[c] == null ? '' : String(row[c]);
    return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  }).join(',');
  const csv = [columns.join(','), ...rows.map(csvRow)].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
  res.send(csv);
});

// Delete lead — admin only
adminRouter.delete('/:id', async (req, res) => {
  const lead = await byId(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found.' });
  await db.prepare('DELETE FROM leads WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export { publicRouter, adminRouter };
