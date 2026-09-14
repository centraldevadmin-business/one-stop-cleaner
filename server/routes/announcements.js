import { Router } from 'express';
import db from '../../db/database.js';

// Public router — only the GET feed shown on the website.
const publicRouter = Router();

// Admin router — everything else (requires auth + permission at mount time).
const adminRouter = Router();

// Public: active announcements shown on the website (newest first).
publicRouter.get('/', async (req, res) => {
  const rows = await db.prepare(
    "SELECT * FROM announcements WHERE active = 1 ORDER BY position ASC, rowid DESC"
  ).all();
  res.json(rows);
});

// Admin: list all announcements (including inactive).
adminRouter.get('/', async (req, res) => {
  res.json(await db.prepare('SELECT * FROM announcements ORDER BY position ASC, rowid DESC').all());
});

// Admin: create announcement.
adminRouter.post('/', async (req, res) => {
  const b = req.body || {};
  if (!b.title) return res.status(400).json({ error: 'title required.' });
  const info = await db.prepare(
    'INSERT INTO announcements (title, body, link, style, active, position) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(b.title, b.body || '', b.link || null, b.style || 'info', b.active !== undefined ? Number(b.active) : 1, b.position || 0);
  res.status(201).json(await db.prepare('SELECT * FROM announcements WHERE id = ?').get(info.lastInsertRowid));
});

// Admin: update announcement.
adminRouter.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const existing = await db.prepare('SELECT * FROM announcements WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Announcement not found.' });
  const b = req.body || {};
  const fields = [];
  const params = [];
  for (const key of ['title', 'body', 'link', 'style', 'active', 'position']) {
    if (b[key] !== undefined) { fields.push(`${key} = ?`); params.push(b[key]); }
  }
  if (!fields.length) return res.status(400).json({ error: 'No updatable fields.' });
  params.push(id);
  await db.prepare(`UPDATE announcements SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  res.json(await db.prepare('SELECT * FROM announcements WHERE id = ?').get(id));
});

// Admin: delete announcement.
adminRouter.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const existing = await db.prepare('SELECT * FROM announcements WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Announcement not found.' });
  await db.prepare('DELETE FROM announcements WHERE id = ?').run(id);
  res.json({ ok: true });
});

export { publicRouter, adminRouter };
