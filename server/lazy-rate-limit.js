// Rate-limit middleware for public lead capture.
//
// The default in-memory store of express-rate-limit is synchronous, so the
// limiter can be created at module load time. This avoids the
// ERR_ERL_CREATED_IN_REQUEST_HANDLER validation warning while still working on
// Cloudflare Workers (no async I/O happens at load time).

import rateLimit from 'express-rate-limit';

const options = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per window
  standardHeaders: true,
  legacyHeaders: false,
};

export const leadRateLimiter = rateLimit(options);

export default leadRateLimiter;
