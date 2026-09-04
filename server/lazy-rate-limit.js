// Rate-limit middleware for public lead capture.
//
// Two constraints shape this file:
//   1. express-rate-limit v7 throws ERR_ERL_CREATED_IN_REQUEST_HANDLER if the
//      limiter is created inside a request handler, so we create it at module
//      load time.
//   2. The default MemoryStore.init() installs a setInterval(), which is async
//      I/O and is disallowed in Cloudflare Workers global scope. We therefore
//      supply a custom store whose init() is fully synchronous.

import rateLimit from 'express-rate-limit';

const options = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per window
  standardHeaders: true,
  legacyHeaders: false,
};

// Synchronous in-memory store: no timers, no async I/O at load time.
// Implements the express-rate-limit `Store` interface.
class SyncMemoryStore {
  constructor() {
    this.clients = new Map();
    this.windowMs = 0;
  }
  init(options) { this.windowMs = options.windowMs; }
  async get(key) { return this.clients.get(key); }
  async increment(key) {
    const now = Date.now();
    let client = this.clients.get(key);
    if (!client || client.resetTime.getTime() <= now) {
      client = { totalHits: 0, resetTime: new Date(now + this.windowMs) };
      this.clients.set(key, client);
    }
    client.totalHits++;
    return client;
  }
  async decrement(key) {
    const client = this.clients.get(key);
    if (client && client.totalHits > 0) client.totalHits--;
  }
  async resetKey(key) { this.clients.delete(key); }
  async resetAll() { this.clients.clear(); }
  shutdown() { /* nothing to tear down */ }
}

export const leadRateLimiter = rateLimit({ ...options, store: new SyncMemoryStore() });

export default leadRateLimiter;
