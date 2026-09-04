import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runExpress } from '../server/express-to-workers.js';
import express from 'express';

// A tiny Express app to exercise the adapter.
const app = express();
app.use(express.json());
app.get('/hello', (req, res) => res.json({ ok: true, path: req.path }));
app.post('/echo', (req, res) => res.json({ received: req.body }));
app.get('/404', (req, res) => res.status(404).json({ error: 'nope' }));

test('adapter: GET returns JSON', async () => {
  const req = new Request('http://127.0.0.1/hello');
  const res = await runExpress(app, req);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.equal(data.path, '/hello');
});

test('adapter: POST body round-trips', async () => {
  const req = new Request('http://127.0.0.1/echo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ a: 1, b: 'two' }),
  });
  const res = await runExpress(app, req);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.deepEqual(data.received, { a: 1, b: 'two' });
});

test('adapter: status codes propagate', async () => {
  const req = new Request('http://127.0.0.1/404');
  const res = await runExpress(app, req);
  assert.equal(res.status, 404);
  const data = await res.json();
  assert.equal(data.error, 'nope');
});
