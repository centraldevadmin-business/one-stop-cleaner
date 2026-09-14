import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import db from '../../db/database.js';
import { authRequired } from '../auth.js';
import { audit } from '../audit.js';

// Public feed — no auth.
const publicRouter = Router();

// Admin management — requires auth.
const adminRouter = Router();
adminRouter.use(authRequired);

// ---------------------------------------------------------------------------
// Image upload — saves files to public/media/uploads and returns a URL.
// The JSON body parser skips multipart requests, so multer handles them here.
// ---------------------------------------------------------------------------
const uploadDir = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'public', 'media', 'uploads'));
if (!isWorkersRuntime()) {
  try { fs.mkdirSync(uploadDir, { recursive: true }); } catch { /* ignore */ }
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '') || '';
    const base = crypto.randomBytes(12).toString('hex');
    cb(null, `${base}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/blog/upload  ->  { url }
adminRouter.post('/upload', (req, res, next) => next(), upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image provided.' });
  const url = `/media/uploads/${req.file.filename}`;
  audit(req, 'blog_upload', null, `Uploaded image "${req.file.originalname}"`);
  res.json({ url });
});

function isWorkersRuntime() {
  return typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers';
}

const byId = async (id) => await db.prepare('SELECT * FROM blog_posts WHERE id = ?').get(id);

// Slugify a title
function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'post';
}

// Public: list published posts (for the blog page)
publicRouter.get('/public', async (req, res) => {
  const { category, q } = req.query;
  let sql = 'SELECT * FROM blog_posts WHERE status = \'published\'';
  const params = [];
  if (category) { sql += ' AND category = ?'; params.push(category); }
  if (q) { sql += ' AND (title LIKE ? OR excerpt LIKE ? OR body LIKE ?)'; const s = `%${q}%`; params.push(s, s, s); }
  sql += ' ORDER BY published_at DESC, rowid DESC LIMIT 100';
  res.json(await db.prepare(sql).all(...params));
});

// Public: single post by slug
publicRouter.get('/public/:slug', async (req, res) => {
  const post = await db.prepare("SELECT * FROM blog_posts WHERE slug = ? AND status = 'published'").get(req.params.slug);
  if (!post) return res.status(404).json({ error: 'Post not found.' });
  res.json(post);
});

// Admin: list all posts
adminRouter.get('/', async (req, res) => {
  const { status, category, q } = req.query;
  let sql = 'SELECT * FROM blog_posts WHERE 1=1';
  const params = [];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (category) { sql += ' AND category = ?'; params.push(category); }
  if (q) { sql += ' AND (title LIKE ? OR author LIKE ? OR slug LIKE ?)'; const s = `%${q}%`; params.push(s, s, s); }
  sql += ' ORDER BY rowid DESC LIMIT 500';
  res.json(await db.prepare(sql).all(...params));
});

// Admin: create post
adminRouter.post('/', async (req, res) => {
  const b = req.body || {};
  if (!b.title) return res.status(400).json({ error: 'title required.' });
  const status = b.status === 'published' ? 'published' : 'draft';
  const slug = b.slug || slugify(b.title);
  const existing = await db.prepare('SELECT id FROM blog_posts WHERE slug = ?').get(slug);
  if (existing) return res.status(409).json({ error: 'Slug already exists.' });
  const info = await db.prepare(`
    INSERT INTO blog_posts (slug, title, excerpt, body, cover_url, category, author, status, published_at)
    VALUES (@slug, @title, @excerpt, @body, @cover_url, @category, @author, @status, @published_at)
  `).run({
    slug,
    title: b.title,
    excerpt: b.excerpt || null,
    body: b.body || null,
    cover_url: b.cover_url || null,
    category: b.category || 'news',
    author: b.author || null,
    status,
    published_at: status === 'published' ? "datetime('now')" : null
  });
  await audit(req, 'blog_create', info.lastInsertRowid, `Created post "${b.title}" (${status})`);
  res.status(201).json({ id: info.lastInsertRowid, slug });
});

// Admin: get one
adminRouter.get('/:id', async (req, res) => {
  const post = await byId(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found.' });
  res.json(post);
});

// Admin: update
adminRouter.put('/:id', async (req, res) => {
  const post = await byId(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found.' });
  const b = req.body || {};
  const fields = [];
  const params = [];
  for (const key of ['title', 'excerpt', 'body', 'cover_url', 'category', 'author', 'status', 'slug', 'meta_title', 'meta_description']) {
    if (b[key] !== undefined) {
      if (key === 'slug' && b.slug !== post.slug) {
        const dup = await db.prepare('SELECT id FROM blog_posts WHERE slug = ?').get(b.slug);
        if (dup) return res.status(409).json({ error: 'Slug already exists.' });
      }
      fields.push(`${key} = ?`);
      params.push(b[key]);
    }
  }
  if (b.status === 'published' && !post.published_at) {
    fields.push("published_at = datetime('now')");
  }
  if (!fields.length) return res.status(400).json({ error: 'No updatable fields.' });
  fields.push("updated_at = datetime('now')");
  params.push(req.params.id);
  await db.prepare(`UPDATE blog_posts SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  await audit(req, 'blog_update', req.params.id, `Updated post "${post.title}"`);
  res.json(await byId(req.params.id));
});

// Admin: delete
adminRouter.delete('/:id', async (req, res) => {
  const post = await byId(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found.' });
  await db.prepare('DELETE FROM blog_posts WHERE id = ?').run(req.params.id);
  await audit(req, 'blog_delete', req.params.id, `Deleted post "${post.title}"`);
  res.json({ ok: true });
});

export { publicRouter, adminRouter };
