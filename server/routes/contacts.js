import { Router } from 'express';
import db from '../../db/database.js';
import { audit } from '../audit.js';

const router = Router();

const byId = async (id) => await db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);

// Public capture — contact / partner / investment forms
router.post('/', async (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.email) return res.status(400).json({ error: 'name and email required.' });
  const info = await db.prepare(`
    INSERT INTO contacts (type, name, email, phone, company, interest, message, status, priority, assigned_to)
    VALUES (@type, @name, @email, @phone, @company, @interest, @message, @status, @priority, @assigned_to)
  `).run({
    type: b.type || 'general',
    name: b.name,
    email: b.email,
    phone: b.phone || null,
    company: b.company || null,
    interest: b.interest || null,
    message: b.message || null,
    status: 'new',
    priority: b.priority || 'normal',
    assigned_to: null
  });
  res.status(201).json({ id: info.lastInsertRowid });
});

// List contacts (CRM) — admin only
router.get('/', async (req, res) => {
  const { status, type, interest, q } = req.query;
  let sql = 'SELECT * FROM contacts WHERE 1=1';
  const params = [];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (type) { sql += ' AND type = ?'; params.push(type); }
  if (interest) { sql += ' AND interest = ?'; params.push(interest); }
  if (q) { sql += ' AND (name LIKE ? OR email LIKE ? OR company LIKE ? OR message LIKE ?)'; const s = `%${q}%`; params.push(s, s, s, s); }
  sql += ' ORDER BY rowid DESC LIMIT 500';
  res.json(await db.prepare(sql).all(...params));
});

// Get one — admin only
router.get('/:id', async (req, res) => {
  const contact = await byId(req.params.id);
  if (!contact) return res.status(404).json({ error: 'Contact not found.' });
  res.json(contact);
});

// Update — admin only
router.put('/:id', async (req, res) => {
  const contact = await byId(req.params.id);
  if (!contact) return res.status(404).json({ error: 'Contact not found.' });
  const b = req.body || {};
  const fields = [];
  const params = [];
  for (const key of ['type', 'name', 'email', 'phone', 'company', 'interest', 'message', 'status', 'priority', 'assigned_to', 'notes']) {
    if (b[key] !== undefined) { fields.push(`${key} = ?`); params.push(b[key]); }
  }
  if (!fields.length) return res.status(400).json({ error: 'No updatable fields.' });
  fields.push("updated_at = datetime('now')");
  params.push(req.params.id);
  await db.prepare(`UPDATE contacts SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  await audit(req, 'contact_update', req.params.id, `Updated contact ${contact.name}`);
  res.json(await byId(req.params.id));
});

// Delete — admin only
router.delete('/:id', async (req, res) => {
  const contact = await byId(req.params.id);
  if (!contact) return res.status(404).json({ error: 'Contact not found.' });
  await db.prepare('DELETE FROM contacts WHERE id = ?').run(req.params.id);
  await audit(req, 'contact_delete', req.params.id, `Deleted contact ${contact.name}`);
  res.json({ ok: true });
});

export default router;
