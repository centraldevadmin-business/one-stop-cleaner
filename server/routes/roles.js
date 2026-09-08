import { Router } from 'express';
import db from '../../db/database.js';
import { audit } from '../audit.js';

const router = Router();

const byId = async (table, id) => await db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);

// List roles
router.get('/', async (req, res) => {
  const roles = await db.prepare('SELECT * FROM roles ORDER BY rowid').all();
  // Attach assigned user counts
  const withCounts = await Promise.all(roles.map(async (r) => {
    const a = await db.prepare('SELECT COUNT(*) c FROM role_assignments WHERE role_id = ?').get(r.id);
    return { ...r, assigned: a.c, permissions: safeParse(r.permissions) };
  }));
  res.json(withCounts);
});

// Create role
router.post('/', async (req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ error: 'name required.' });
  const existing = await db.prepare('SELECT id FROM roles WHERE name = ?').get(b.name);
  if (existing) return res.status(409).json({ error: 'Role already exists.' });
  const permissions = Array.isArray(b.permissions) ? b.permissions : safeParse(b.permissions);
  const info = await db.prepare('INSERT INTO roles (name, label, permissions) VALUES (?, ?, ?)').run(
    b.name, b.label || null, JSON.stringify(permissions)
  );
  await audit(req, 'role_create', info.lastInsertRowid, `Created role ${b.name}`);
  res.status(201).json({ id: info.lastInsertRowid, name: b.name, label: b.label, permissions });
});

// Update role
router.put('/:id', async (req, res) => {
  const role = await byId('roles', req.params.id);
  if (!role) return res.status(404).json({ error: 'Role not found.' });
  const b = req.body || {};
  const fields = [];
  const params = [];
  if (b.label !== undefined) { fields.push('label = ?'); params.push(b.label); }
  if (b.permissions !== undefined) {
    const permissions = Array.isArray(b.permissions) ? b.permissions : safeParse(b.permissions);
    fields.push('permissions = ?');
    params.push(JSON.stringify(permissions));
  }
  if (!fields.length) return res.status(400).json({ error: 'No updatable fields.' });
  params.push(req.params.id);
  await db.prepare(`UPDATE roles SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  res.json(await byId('roles', req.params.id));
});

// Delete role
router.delete('/:id', async (req, res) => {
  const role = await byId('roles', req.params.id);
  if (!role) return res.status(404).json({ error: 'Role not found.' });
  await db.prepare('DELETE FROM roles WHERE id = ?').run(req.params.id);
  await audit(req, 'role_delete', req.params.id, `Deleted role ${role.name}`);
  res.json({ ok: true });
});

// Assign a role to a user
router.post('/assignments', async (req, res) => {
  const b = req.body || {};
  if (!b.user_id || !b.role_id) return res.status(400).json({ error: 'user_id and role_id required.' });
  const user = await byId('users', b.user_id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  const role = await byId('roles', b.role_id);
  if (!role) return res.status(404).json({ error: 'Role not found.' });
  // Avoid duplicates
  const existing = await db.prepare('SELECT id FROM role_assignments WHERE user_id = ? AND role_id = ?').get(b.user_id, b.role_id);
  if (existing) return res.status(409).json({ error: 'Role already assigned.' });
  const info = await db.prepare('INSERT INTO role_assignments (user_id, role_id) VALUES (?, ?)').run(b.user_id, b.role_id);
  await audit(req, 'role_assign', info.lastInsertRowid, `Assigned role ${role.name} to ${user.email}`);
  res.status(201).json({ id: info.lastInsertRowid });
});

// Unassign a role from a user
router.delete('/assignments', async (req, res) => {
  const b = req.body || {};
  if (!b.user_id || !b.role_id) return res.status(400).json({ error: 'user_id and role_id required.' });
  await db.prepare('DELETE FROM role_assignments WHERE user_id = ? AND role_id = ?').run(b.user_id, b.role_id);
  await audit(req, 'role_unassign', b.user_id, `Unassigned role ${b.role_id}`);
  res.json({ ok: true });
});

// List a user's assigned roles
router.get('/assignments/:userId', async (req, res) => {
  const rows = await db.prepare(`
    SELECT ra.*, r.name, r.label, r.permissions
    FROM role_assignments ra JOIN roles r ON r.id = ra.role_id
    WHERE ra.user_id = ?
  `).all(req.params.userId);
  res.json(rows.map((r) => ({ ...r, permissions: safeParse(r.permissions) })));
});

function safeParse(v) {
  if (Array.isArray(v)) return v;
  try { return JSON.parse(v || '[]'); } catch { return []; }
}

export default router;
