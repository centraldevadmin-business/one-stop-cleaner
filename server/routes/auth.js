import { Router } from 'express';
import db from '../../db/database.js';
import { hashPassword, verifyPassword, signToken } from '../auth.js';
import { authRequired } from '../auth.js';

const router = Router();

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });

  const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !user.active) return res.status(401).json({ error: 'Invalid credentials.' });

  console.log("verifyPassword starting..."); const ok = await verifyPassword(password, user.password_hash);
  console.log("verifyPassword finished: " + ok); if (!ok) return res.status(401).json({ error: 'Invalid credentials.' });

  res.json({
    token: await signToken({ id: user.id, name: user.name, email: user.email, role: user.role }),
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
});

// Current user — verifies the token and returns the authenticated user.
router.get('/me', authRequired, (req, res) => {
  res.json({
    id: req.user.id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
  });
});

// Create admin (used by seed script)
router.post('/admins', async (req, res) => {
  const { name, email, password, role = 'superadmin' } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required.' });
  const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'Email already registered.' });
  const password_hash = await hashPassword(password);
  const info = await db.prepare(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
  ).run(name, email, password_hash, role);
  res.status(201).json({ id: info.lastInsertRowid, name, email, role });
});

// List users (admin only)
router.get('/', authRequired, async (req, res) => {
  const users = await db.prepare('SELECT id, name, email, role, active, created_at FROM users ORDER BY rowid').all();
  res.json(users);
});

// Delete user (admin only)
router.delete('/:id', authRequired, async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) return res.status(400).json({ error: 'You cannot delete your own account.' });
  await db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ ok: true });
});

export default router;
