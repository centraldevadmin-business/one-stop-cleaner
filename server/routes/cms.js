import { Router } from 'express';
import db from '../../db/database.js';
import { authRequired } from '../auth.js';

const router = Router();
router.use(authRequired);

const byId = async (table, id) => await db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);

/* ---------------- Content blocks ---------------- */
router.get('/blocks', async (req, res) => {
  const { active } = req.query;
  let sql = 'SELECT * FROM content_blocks';
  if (active === 'true') sql += ' WHERE active = 1';
  sql += ' ORDER BY position, rowid';
  res.json(await db.prepare(sql).all());
});

router.post('/blocks', async (req, res) => {
  const b = req.body || {};
  if (!b.key || !b.title) return res.status(400).json({ error: 'key and title required.' });
  const existing = await db.prepare('SELECT id FROM content_blocks WHERE key = ?').get(b.key);
  if (existing) return res.status(409).json({ error: 'Content key already exists.' });
  const info = await db.prepare(`
    INSERT INTO content_blocks (key, title, body, media_url, position, active)
    VALUES (@key, @title, @body, @media_url, @position, @active)
  `).run({
    key: b.key, title: b.title, body: b.body || null,
    media_url: b.media_url || null, position: b.position || 0, active: b.active !== undefined ? b.active : 1
  });
  res.status(201).json({ id: info.lastInsertRowid });
});

router.put('/blocks/:id', async (req, res) => {
  const block = await byId('content_blocks', req.params.id);
  if (!block) return res.status(404).json({ error: 'Content block not found.' });
  const b = req.body || {};
  const fields = [];
  const params = [];
  for (const key of ['key', 'title', 'body', 'media_url', 'position', 'active']) {
    if (b[key] !== undefined) { fields.push(`${key} = ?`); params.push(b[key]); }
  }
  if (!fields.length) return res.status(400).json({ error: 'No updatable fields.' });
  params.push(req.params.id);
  await db.prepare(`UPDATE content_blocks SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  res.json(await byId('content_blocks', req.params.id));
});

router.delete('/blocks/:id', async (req, res) => {
  const block = await byId('content_blocks', req.params.id);
  if (!block) return res.status(404).json({ error: 'Content block not found.' });
  await db.prepare('DELETE FROM content_blocks WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

/* ---------------- Products ---------------- */
router.get('/products', async (req, res) => {
  const { active } = req.query;
  let sql = 'SELECT * FROM products';
  if (active === 'true') sql += ' WHERE active = 1';
  sql += ' ORDER BY position, rowid';
  res.json(await db.prepare(sql).all());
});

router.post('/products', async (req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ error: 'name required.' });
  const info = await db.prepare(`
    INSERT INTO products (name, category, description, price, currency, image_url, in_stock, position, active)
    VALUES (@name, @category, @description, @price, @currency, @image_url, @in_stock, @position, @active)
  `).run({
    name: b.name, category: b.category || 'consumable', description: b.description || null,
    price: Number(b.price) || 0, currency: b.currency || 'AUD', image_url: b.image_url || null,
    in_stock: b.in_stock !== undefined ? b.in_stock : 0, position: b.position || 0, active: b.active !== undefined ? b.active : 1
  });
  res.status(201).json({ id: info.lastInsertRowid });
});

router.put('/products/:id', async (req, res) => {
  const product = await byId('products', req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found.' });
  const b = req.body || {};
  const fields = [];
  const params = [];
  for (const key of ['name', 'category', 'description', 'price', 'currency', 'image_url', 'in_stock', 'position', 'active']) {
    if (b[key] !== undefined) {
      params.push(key === 'price' ? Number(b[key]) : b[key]);
      fields.push(`${key} = ?`);
    }
  }
  if (!fields.length) return res.status(400).json({ error: 'No updatable fields.' });
  params.push(req.params.id);
  await db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  res.json(await byId('products', req.params.id));
});

router.delete('/products/:id', async (req, res) => {
  const product = await byId('products', req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found.' });
  await db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

/* ---------------- Media ---------------- */
router.get('/media', async (req, res) => {
  res.json(await db.prepare('SELECT * FROM media ORDER BY rowid DESC').all());
});

router.post('/media', async (req, res) => {
  const b = req.body || {};
  if (!b.title || !b.url) return res.status(400).json({ error: 'title and url required.' });
  const info = await db.prepare(`
    INSERT INTO media (title, type, url)
    VALUES (@title, @type, @url)
  `).run({
    title: b.title, type: b.type || 'image', url: b.url
  });
  res.status(201).json({ id: info.lastInsertRowid });
});

router.delete('/media/:id', async (req, res) => {
  const item = await byId('media', req.params.id);
  if (!item) return res.status(404).json({ error: 'Media not found.' });
  await db.prepare('DELETE FROM media WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

/* ---------------- Announcements ---------------- */
router.get('/announcements', async (req, res) => {
  const { active } = req.query;
  let sql = 'SELECT * FROM announcements';
  if (active !== undefined) sql += active === 'true' ? ' WHERE active = 1' : ' WHERE active = 0';
  sql += ' ORDER BY position, rowid';
  res.json(await db.prepare(sql).all());
});

router.post('/announcements', async (req, res) => {
  const b = req.body || {};
  if (!b.title || !b.body) return res.status(400).json({ error: 'title and body required.' });
  const info = await db.prepare(`
    INSERT INTO announcements (title, body, link, style, active, position)
    VALUES (@title, @body, @link, @style, @active, @position)
  `).run({
    title: b.title, body: b.body || '', link: b.link || null,
    style: b.style || 'info',
    active: b.active !== undefined ? (b.active ? 1 : 0) : 1,
    position: b.position || 0,
  });
  res.status(201).json({ id: info.lastInsertRowid });
});

router.put('/announcements/:id', async (req, res) => {
  const ann = await byId('announcements', req.params.id);
  if (!ann) return res.status(404).json({ error: 'Announcement not found.' });
  const b = req.body || {};
  const fields = [];
  const params = [];
  for (const key of ['title', 'body', 'link', 'style', 'active', 'position']) {
    if (b[key] !== undefined) {
      params.push(key === 'active' ? (b[key] ? 1 : 0) : b[key]);
      fields.push(`${key} = ?`);
    }
  }
  if (!fields.length) return res.status(400).json({ error: 'No updatable fields.' });
  params.push(req.params.id);
  await db.prepare(`UPDATE announcements SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  res.json(await byId('announcements', req.params.id));
});

router.delete('/announcements/:id', async (req, res) => {
  const ann = await byId('announcements', req.params.id);
  if (!ann) return res.status(404).json({ error: 'Announcement not found.' });
  await db.prepare('DELETE FROM announcements WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

/* ---------------- Legal Pages ---------------- */
router.get('/legal', async (req, res) => {
  res.json(await db.prepare('SELECT * FROM legal_pages ORDER BY rowid').all());
});

router.put('/legal/:key', async (req, res) => {
  const b = req.body || {};
  if (!b.body) return res.status(400).json({ error: 'body required.' });
  const existing = await db.prepare('SELECT id FROM legal_pages WHERE key = ?').get(req.params.key);
  if (existing) {
    await db.prepare('UPDATE legal_pages SET body = ?, updated_at = datetime(\'now\') WHERE key = ?')
      .run(b.body, req.params.key);
    res.json(await byId('legal_pages', existing.id));
  } else {
    const info = await db.prepare(
      'INSERT INTO legal_pages (key, title, slug, body) VALUES (?, ?, ?, ?)'
    ).run(req.params.key, req.params.key, req.params.key, b.body);
    res.status(201).json(await byId('legal_pages', info.lastInsertRowid));
  }
});

export default router;
