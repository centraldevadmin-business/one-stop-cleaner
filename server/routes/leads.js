import { Router } from 'express';
import db from '../../db/database.js';

// Public capture router — only the POST endpoint (contact/waitlist/partner/product forms).
const publicRouter = Router();

// Admin router — read/update/delete (requires authentication).
const adminRouter = Router();

const byId = (id) => db.prepare('SELECT * FROM leads WHERE id = ?').get(id);

// List leads (with optional filters) — admin only
adminRouter.get('/', (req, res) => {
  const { status, stage, source, priority, q } = req.query;
  let sql = 'SELECT * FROM leads WHERE 1=1';
  const params = [];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (stage) { sql += ' AND stage = ?'; params.push(stage); }
  if (source) { sql += ' AND source = ?'; params.push(source); }
  if (priority) { sql += ' AND priority = ?'; params.push(priority); }
  if (q) { sql += ' AND (name LIKE ? OR email LIKE ? OR company LIKE ? OR message LIKE ?)'; const s = `%${q}%`; params.push(s, s, s, s); }
  sql += ' ORDER BY rowid DESC LIMIT 500';
  res.json(db.prepare(sql).all(...params));
});

// Create lead (public — from contact/waitlist forms)
publicRouter.post('/', (req, res) => {
  const b = req.body || {};
  const info = db.prepare(`
    INSERT INTO leads (source, status, stage, priority, name, email, phone, company, message, city, service_type, notes)
    VALUES (@source, @status, @stage, @priority, @name, @email, @phone, @company, @message, @city, @service_type, @notes)
  `).run({
    source: b.source || 'contact',
    status: b.status || 'new',
    stage: b.stage || 'discovery',
    priority: b.priority || 'normal',
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
adminRouter.get('/:id', (req, res) => {
  const lead = byId(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found.' });
  res.json(lead);
});

// Update lead (stage/status/notes/assignee) — admin only
adminRouter.put('/:id', (req, res) => {
  const lead = byId(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found.' });
  const b = req.body || {};
  const fields = [];
  const params = [];
  for (const key of ['status', 'stage', 'priority', 'name', 'email', 'phone', 'company', 'message', 'city', 'service_type', 'notes', 'assigned_to']) {
    if (b[key] !== undefined) { fields.push(`${key} = ?`); params.push(b[key]); }
  }
  if (!fields.length) return res.status(400).json({ error: 'No updatable fields.' });
  fields.push("updated_at = datetime('now')");
  params.push(req.params.id);
  db.prepare(`UPDATE leads SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  res.json(byId(req.params.id));
});

// Delete lead — admin only
adminRouter.delete('/:id', (req, res) => {
  const lead = byId(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found.' });
  db.prepare('DELETE FROM leads WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export { publicRouter, adminRouter };
