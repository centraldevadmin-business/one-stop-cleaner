import { Router } from 'express';
import db from '../../db/database.js';
import { requireRole } from '../auth.js';
import { audit } from '../audit.js';

const router = Router();

const byId = async (id) => await db.prepare('SELECT * FROM tickets WHERE id = ?').get(id);
const byRef = async (ref) => await db.prepare('SELECT * FROM tickets WHERE ref = ?').get(ref);

// Generate a short unique ref like "TK-1042"
function makeRef() {
  return 'TK-' + Math.floor(1000 + Math.random() * 9000);
}

// List tickets (CRM) — admin only
router.get('/', async (req, res) => {
  const { status, priority, category, q } = req.query;
  let sql = 'SELECT * FROM tickets WHERE 1=1';
  const params = [];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (priority) { sql += ' AND priority = ?'; params.push(priority); }
  if (category) { sql += ' AND category = ?'; params.push(category); }
  if (q) { sql += ' AND (subject LIKE ? OR requester_name LIKE ? OR requester_email LIKE ? OR ref LIKE ?)'; const s = `%${q}%`; params.push(s, s, s, s); }
  sql += ' ORDER BY rowid DESC LIMIT 500';
  res.json(await db.prepare(sql).all(...params));
});

// Get one ticket with its messages — admin only
router.get('/:id', async (req, res) => {
  const ticket = await byId(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });
  const messages = await db.prepare('SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY rowid').all(req.params.id);
  res.json({ ...ticket, messages });
});

// Create a ticket — public (from a customer support form)
router.post('/', async (req, res) => {
  const b = req.body || {};
  if (!b.subject || !b.message) return res.status(400).json({ error: 'subject and message required.' });
  const ref = makeRef();
  const info = await db.prepare(`
    INSERT INTO tickets (ref, subject, category, priority, status, requester_name, requester_email, message)
    VALUES (@ref, @subject, @category, @priority, @status, @requester_name, @requester_email, @message)
  `).run({
    ref,
    subject: b.subject,
    category: b.category || 'general',
    priority: b.priority || 'normal',
    status: 'open',
    requester_name: b.requester_name || null,
    requester_email: b.requester_email || null,
    message: b.message
  });
  await db.prepare('INSERT INTO ticket_messages (ticket_id, author_name, author_email, author_role, message) VALUES (?, ?, ?, ?, ?)')
    .run(info.lastInsertRowid, b.requester_name || 'Customer', b.requester_email || null, 'customer', b.message);
  await audit(req, 'ticket_create', ref, `Created ticket ${ref}: ${b.subject}`);
  res.status(201).json({ id: info.lastInsertRowid, ref });
});

// Update a ticket — admin only
router.put('/:id', async (req, res) => {
  const ticket = await byId(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });
  const b = req.body || {};
  const fields = [];
  const params = [];
  for (const key of ['subject', 'category', 'priority', 'status', 'assigned_to']) {
    if (b[key] !== undefined) { fields.push(`${key} = ?`); params.push(b[key]); }
  }
  if (!fields.length) return res.status(400).json({ error: 'No updatable fields.' });
  fields.push("updated_at = datetime('now')");
  params.push(req.params.id);
  await db.prepare(`UPDATE tickets SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  await audit(req, 'ticket_update', req.params.id, `Updated ticket ${ticket.ref}`);
  res.json(await byId(req.params.id));
});

// Add a message to a ticket — admin only
router.post('/:id/messages', async (req, res) => {
  const ticket = await byId(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });
  const b = req.body || {};
  if (!b.message) return res.status(400).json({ error: 'message required.' });
  const info = await db.prepare('INSERT INTO ticket_messages (ticket_id, author_name, author_email, author_role, message) VALUES (?, ?, ?, ?, ?)')
    .run(req.params.id, b.author_name || (req.user && req.user.name) || 'Support', b.author_email || null, b.author_role || 'agent', b.message);
  await db.prepare("UPDATE tickets SET updated_at = datetime('now') WHERE id = ?").run(req.params.id);
  res.status(201).json({ id: info.lastInsertRowid });
});

// Delete a ticket — admin only
router.delete('/:id', async (req, res) => {
  const ticket = await byId(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });
  await db.prepare('DELETE FROM tickets WHERE id = ?').run(req.params.id);
  await audit(req, 'ticket_delete', req.params.id, `Deleted ticket ${ticket.ref}`);
  res.json({ ok: true });
});

export default router;
