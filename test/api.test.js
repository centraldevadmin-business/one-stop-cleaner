import { test } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../server.js';
import { initDb } from '../db/database.js';
import db from '../db/database.js';
import bcrypt from 'bcryptjs';

// Use a test database so we never touch the real one.
process.env.DB_PATH = ':memory:';
initDb();

let token = '';
let adminId = 0;

// Seed the in-memory DB so tests have data to work with.
async function seed() {
  db.prepare('DELETE FROM users').run();
  db.prepare('DELETE FROM leads').run();
  const superAdminHash = await bcrypt.hash('admin123', 10);
  db.prepare('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)')
    .run('Super Admin', 'admin@onestopcleaner.com', superAdminHash, 'superadmin');
  const insertLead = db.prepare('INSERT INTO leads (source,status,stage,priority,name,email,phone,company,message,city,service_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
  insertLead.run('contact', 'new', 'discovery', 'high', 'Emma Wilson', 'emma.w@example.com', '0400 000 001', null, 'Need weekly home cleaning in Sydney.', 'Sydney', 'home_cleaning', null);
}
// Start the server on a random port so fetch has a real base URL.
const server = app.listen(0);
server.unref();
const BASE = `http://127.0.0.1:${server.address().port}`;

await seed();

// Authenticate so protected routes work throughout the suite.
const login = await api('/api/auth/login', { method: 'POST', body: { email: 'admin@onestopcleaner.com', password: 'admin123' } });
token = login.data.token;

// Close the DB and server before exit to avoid better-sqlite3's native GC crash.
// process.on('exit') fires synchronously before teardown/GC.
process.on('exit', () => {
  try { db.close(); } catch { /* ignore */ }
  try { server.close(); } catch { /* ignore */ }
});

async function api(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  return { status: res.status, data };
}

// ---- Auth ----
test('auth: create admin', async () => {
  const res = await api('/api/auth/admins', {
    method: 'POST',
    body: { name: 'Test Admin', email: 'admin@test.com', password: 'admin123', role: 'superadmin' },
  });
  assert.equal(res.status, 201);
  assert.ok(res.data.id);
  adminId = res.data.id;
});

test('auth: duplicate admin fails', async () => {
  const res = await api('/api/auth/admins', {
    method: 'POST',
    body: { name: 'Dup', email: 'admin@test.com', password: 'admin123' },
  });
  assert.equal(res.status, 409);
});

test('auth: login with valid credentials', async () => {
  const res = await api('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@test.com', password: 'admin123' },
  });
  assert.equal(res.status, 200);
  assert.ok(res.data.token);
  token = res.data.token;
});

test('auth: login with wrong password fails', async () => {
  const res = await api('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@test.com', password: 'wrongpass' },
  });
  assert.equal(res.status, 401);
});

test('auth: login missing fields fails', async () => {
  const res = await api('/api/auth/login', { method: 'POST', body: { email: 'x@y.com' } });
  assert.equal(res.status, 400);
});

// ---- Protected routes require auth ----
test('leads: listing without token is rejected', async () => {
  const saved = token;
  token = '';
  const res = await api('/api/leads');
  assert.equal(res.status, 401);
  token = saved;
});

// ---- Leads / CRM ----
test('leads: create a lead', async () => {
  const res = await api('/api/leads', {
    method: 'POST',
    body: { source: 'contact', name: 'Jane Doe', email: 'jane@example.com', message: 'Need home cleaning', city: 'Sydney' },
  });
  assert.equal(res.status, 201);
  assert.ok(res.data.id);
});

test('leads: create a lead without auth (public capture)', async () => {
  const saved = token;
  token = '';
  const res = await api('/api/leads', {
    method: 'POST',
    body: { source: 'waitlist', email: 'wait@example.com' },
  });
  assert.equal(res.status, 201);
  token = saved;
});

test('leads: list returns leads', async () => {
  const res = await api('/api/leads');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.data));
  assert.ok(res.data.length >= 2);
});

test('leads: get one by id', async () => {
  const list = await api('/api/leads');
  const id = list.data[0].id;
  const res = await api(`/api/leads/${id}`);
  assert.equal(res.status, 200);
  assert.equal(res.data.id, id);
});

test('leads: update stage and status', async () => {
  const list = await api('/api/leads');
  const id = list.data[0].id;
  const res = await api(`/api/leads/${id}`, {
    method: 'PUT',
    body: { status: 'qualified', stage: 'proposal', notes: 'Followed up' },
  });
  assert.equal(res.status, 200);
  assert.equal(res.data.status, 'qualified');
  assert.equal(res.data.stage, 'proposal');
  assert.equal(res.data.notes, 'Followed up');
});

test('leads: filter by status', async () => {
  const res = await api('/api/leads?status=new');
  assert.equal(res.status, 200);
  for (const lead of res.data) assert.equal(lead.status, 'new');
});

test('leads: invalid id returns 404', async () => {
  const res = await api('/api/leads/999999');
  assert.equal(res.status, 404);
});

test('leads: delete a lead', async () => {
  const res = await api('/api/leads/1', { method: 'DELETE' });
  assert.equal(res.status, 200);
  const del = await api('/api/leads/1');
  assert.equal(del.status, 404);
});

// ---- CMS ----
test('cms: create content block', async () => {
  const res = await api('/api/cms/blocks', {
    method: 'POST',
    body: { key: 'test_block', title: 'Test Block', body: 'Hello', position: 5 },
  });
  assert.equal(res.status, 201);
  assert.ok(res.data.id);
});

test('cms: duplicate key fails', async () => {
  const res = await api('/api/cms/blocks', {
    method: 'POST',
    body: { key: 'test_block', title: 'Dup' },
  });
  assert.equal(res.status, 409);
});

test('cms: list blocks', async () => {
  const res = await api('/api/cms/blocks');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.data));
});

test('cms: update block', async () => {
  const list = await api('/api/cms/blocks');
  const id = list.data.find((b) => b.key === 'test_block').id;
  const res = await api(`/api/cms/blocks/${id}`, { method: 'PUT', body: { body: 'Updated body', active: 0 } });
  assert.equal(res.status, 200);
  assert.equal(res.data.body, 'Updated body');
  assert.equal(res.data.active, 0);
});

test('cms: delete block', async () => {
  const list = await api('/api/cms/blocks');
  const id = list.data.find((b) => b.key === 'test_block').id;
  const res = await api(`/api/cms/blocks/${id}`, { method: 'DELETE' });
  assert.equal(res.status, 200);
});

// ---- Products ----
test('products: create product', async () => {
  const res = await api('/api/cms/products', {
    method: 'POST',
    body: { name: 'Test Product', category: 'consumable', price: 12.5, in_stock: 1 },
  });
  assert.equal(res.status, 201);
});

test('products: list products', async () => {
  const res = await api('/api/cms/products');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.data));
});

test('products: update stock', async () => {
  const list = await api('/api/cms/products');
  const id = list.data[0].id;
  const res = await api(`/api/cms/products/${id}`, { method: 'PUT', body: { in_stock: 0 } });
  assert.equal(res.status, 200);
  assert.equal(res.data.in_stock, 0);
});

// ---- Campaigns ----
test('campaigns: create campaign', async () => {
  const res = await api('/api/campaigns', {
    method: 'POST',
    body: { name: 'Test Campaign', channel: 'email', audience: 'waitlist', subject: 'Hi', body: 'Body text' },
  });
  assert.equal(res.status, 201);
  assert.ok(res.data.id);
});

test('campaigns: create without channel fails', async () => {
  const res = await api('/api/campaigns', { method: 'POST', body: { name: 'No channel' } });
  assert.equal(res.status, 400);
});

test('campaigns: list campaigns', async () => {
  const res = await api('/api/campaigns');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.data));
});

test('campaigns: send campaign counts recipients', async () => {
  const list = await api('/api/campaigns');
  const id = list.data[0].id;
  const res = await api(`/api/campaigns/${id}/send`, { method: 'POST' });
  assert.equal(res.status, 200);
  assert.equal(res.data.status, 'running');
  assert.ok(typeof res.data.recipients === 'number');
});

test('campaigns: get one with stats', async () => {
  const list = await api('/api/campaigns');
  const id = list.data[0].id;
  const res = await api(`/api/campaigns/${id}`);
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.data.stats));
});

// ---- Analytics ----
test('analytics: track event', async () => {
  const res = await api('/api/analytics/track', {
    method: 'POST',
    body: { event_name: 'waitlist_signup', page: '/contact', value: 1 },
  });
  assert.equal(res.status, 201);
});

test('analytics: dashboard returns stats', async () => {
  const res = await api('/api/analytics/dashboard');
  assert.equal(res.status, 200);
  assert.ok(typeof res.data.leads === 'number');
  assert.ok(Array.isArray(res.data.byStatus));
  assert.ok(Array.isArray(res.data.bySource));
});

// ---- Health ----
test('health check', async () => {
  const res = await api('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.data.ok, true);
});

// ---- 404 ----
test('unknown api route returns 404', async () => {
  const res = await api('/api/does-not-exist');
  assert.equal(res.status, 404);
});
