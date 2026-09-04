import { Router } from 'express';
import db from '../../db/database.js';

const router = Router();

const byId = (table, id) => db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);

/* ---------------- Content blocks ---------------- */
router.get('/blocks', (req, res) => {
  const { active } = req.query;
  let sql = 'SELECT * FROM content_blocks';
  if (active === 'true') sql += ' WHERE active = 1';
  sql += ' ORDER BY position, rowid';
  res.json(db.prepare(sql).all());
});

router.post('/blocks', (req, res) => {
  const b = req.body || {};
  if (!b.key || !b.title) return res.status(400).json({ error: 'key and title required.' });
  const existing = db.prepare('SELECT id FROM content_blocks WHERE key = ?').get(b.key);
  if (existing) return res.status(409).json({ error: 'Content key already exists.' });
  const info = db.prepare(`
    INSERT INTO content_blocks (key, title, body, media_url, position, active)
    VALUES (@key, @title, @body, @media_url, @position, @active)
  `).run({
    key: b.key, title: b.title, body: b.body || null,
    media_url: b.media_url || null, position: b.position || 0, active: b.active !== undefined ? b.active : 1
  });
  res.status(201).json({ id: info.lastInsertRowid });
});

router.put('/blocks/:id', (req, res) => {
  const block = byId('content_blocks', req.params.id);
  if (!block) return res.status(404).json({ error: 'Content block not found.' });
  const b = req.body || {};
  const fields = [];
  const params = [];
  for (const key of ['key', 'title', 'body', 'media_url', 'position', 'active']) {
    if (b[key] !== undefined) { fields.push(`${key} = ?`); params.push(b[key]); }
  }
  if (!fields.length) return res.status(400).json({ error: 'No updatable fields.' });
  params.push(req.params.id);
  db.prepare(`UPDATE content_blocks SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  res.json(byId('content_blocks', req.params.id));
});

router.delete('/blocks/:id', (req, res) => {
  const block = byId('content_blocks', req.params.id);
  if (!block) return res.status(404).json({ error: 'Content block not found.' });
  db.prepare('DELETE FROM content_blocks WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

/* ---------------- Products ---------------- */
router.get('/products', (req, res) => {
  const { active } = req.query;
  let sql = 'SELECT * FROM products';
  if (active === 'true') sql += ' WHERE active = 1';
  sql += ' ORDER BY position, rowid';
  res.json(db.prepare(sql).all());
});

router.post('/products', (req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ error: 'name required.' });
  const info = db.prepare(`
    INSERT INTO products (name, category, description, price, currency, image_url, in_stock, position, active)
    VALUES (@name, @category, @description, @price, @currency, @image_url, @in_stock, @position, @active)
  `).run({
    name: b.name, category: b.category || 'consumable', description: b.description || null,
    price: Number(b.price) || 0, currency: b.currency || 'AUD', image_url: b.image_url || null,
    in_stock: b.in_stock !== undefined ? b.in_stock : 0, position: b.position || 0, active: b.active !== undefined ? b.active : 1
  });
  res.status(201).json({ id: info.lastInsertRowid });
});

router.put('/products/:id', (req, res) => {
  const product = byId('products', req.params.id);
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
  db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  res.json(byId('products', req.params.id));
});

router.delete('/products/:id', (req, res) => {
  const product = byId('products', req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found.' });
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

/* ---------------- Media ---------------- */
router.get('/media', (req, res) => {
  res.json(db.prepare('SELECT * FROM media ORDER BY rowid DESC').all());
});

router.post('/media', (req, res) => {
  const b = req.body || {};
  if (!b.title || !b.url) return res.status(400).json({ error: 'title and url required.' });
  const info = db.prepare(`
    INSERT INTO media (title, type, url)
    VALUES (@title, @type, @url)
  `).run({
    title: b.title, type: b.type || 'image', url: b.url
  });
  res.status(201).json({ id: info.lastInsertRowid });
});

router.delete('/media/:id', (req, res) => {
  const item = byId('media', req.params.id);
  if (!item) return res.status(404).json({ error: 'Media not found.' });
  db.prepare('DELETE FROM media WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
