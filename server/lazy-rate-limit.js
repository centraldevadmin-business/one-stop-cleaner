// Lazy rate-limit middleware.
//
// `express-rate-limit`'s `init()` performs async I/O (it sets up a timer),
// which is disallowed in Cloudflare Workers global scope. Calling
// `rateLimit(...)` at module load therefore crashes on Workers.
//
// This wrapper defers the actual `rateLimit(...)` call until the first request
// arrives (inside a handler), so it works in both Node and Workers.

import rateLimit from 'express-rate-limit';

const options = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per window
  standardHeaders: true,
  legacyHeaders: false,
};

let limiter = null;

export function leadRateLimiter(req, res, next) {
  if (!limiter) {
    limiter = rateLimit(options);
  }
  limiter(req, res, next);
}

export default leadRateLimiter;
