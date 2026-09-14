import { Router } from 'express';
import db from '../../db/database.js';

// Public router — only the GET-by-slug feed shown on the website.
const publicRouter = Router();

// Admin router — list + upsert (requires auth + permission at mount time).
const adminRouter = Router();

// Public: fetch a legal page by slug (privacy / terms).
publicRouter.get('/:slug', async (req, res) => {
  const page = await db.prepare('SELECT * FROM legal_pages WHERE slug = ?').get(req.params.slug);
  if (!page) return res.status(404).json({ error: 'Page not found.' });
  res.json(page);
});

// Admin: list all legal pages.
adminRouter.get('/', async (req, res) => {
  res.json(await db.prepare('SELECT * FROM legal_pages ORDER BY rowid').all());
});

// Admin: create or update a legal page (upsert by key).
adminRouter.post('/', async (req, res) => {
  const b = req.body || {};
  if (!b.key || !b.title || b.body === undefined) {
    return res.status(400).json({ error: 'key, title, and body required.' });
  }
  const existing = await db.prepare('SELECT id FROM legal_pages WHERE key = ?').get(b.key);
  if (existing) {
    await db.prepare(
      'UPDATE legal_pages SET title = ?, body = ?, slug = ?, updated_at = datetime(\'now\') WHERE id = ?'
    ).run(b.title, b.body, b.slug || b.key, existing.id);
    res.json(await db.prepare('SELECT * FROM legal_pages WHERE id = ?').get(existing.id));
  } else {
    const info = await db.prepare(
      'INSERT INTO legal_pages (key, title, slug, body) VALUES (?, ?, ?, ?)'
    ).run(b.key, b.title, b.slug || b.key, b.body);
    res.status(201).json(await db.prepare('SELECT * FROM legal_pages WHERE id = ?').get(info.lastInsertRowid));
  }
});

// Admin: update a legal page by slug (privacy / terms).
adminRouter.put('/:slug', async (req, res) => {
  const b = req.body || {};
  const page = await db.prepare('SELECT * FROM legal_pages WHERE slug = ?').get(req.params.slug);
  if (!page) return res.status(404).json({ error: 'Page not found.' });
  const fields = [];
  const params = [];
  for (const key of ['title', 'body', 'slug']) {
    if (b[key] !== undefined) { fields.push(`${key} = ?`); params.push(b[key]); }
  }
  if (!fields.length) return res.status(400).json({ error: 'No updatable fields.' });
  fields.push("updated_at = datetime('now')");
  params.push(page.id);
  await db.prepare(`UPDATE legal_pages SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  res.json(await db.prepare('SELECT * FROM legal_pages WHERE id = ?').get(page.id));
});

export { publicRouter, adminRouter };
