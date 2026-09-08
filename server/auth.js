import jwt from 'jsonwebtoken';
import db from '../db/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_EXPIRES = '7d';

// ---------------------------------------------------------------------------
// Password hashing — Web Crypto (PBKDF2), works on BOTH Node and Cloudflare
// Workers. bcryptjs uses a synchronous busy-loop that hangs the Workers
// runtime, so we can't use it in production.
// ---------------------------------------------------------------------------

const PBKDF2_ROUNDS = 120000;
const KEY_LEN = 32;
const SALT_LEN = 16;

function randomBytes(n) {
  const arr = new Uint8Array(n);
  crypto.getRandomValues(arr);
  return arr;
}

function toB64(buf) {
  let str = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str);
}

function fromB64(b64) {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr.buffer;
}

async function hashPassword(plain) {
  const salt = randomBytes(SALT_LEN);
  const keyBuf = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(plain)), { name: 'PBKDF2' }, false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ROUNDS, hash: 'SHA-256' },
    keyBuf,
    KEY_LEN * 8
  );
  return `pbkdf2$${PBKDF2_ROUNDS}$${toB64(salt.buffer)}$${toB64(bits)}`;
}

async function verifyPassword(plain, stored) {
  if (!stored || !stored.startsWith('pbkdf2$')) return false;
  const [prefix, roundsStr, saltB64, hashB64] = stored.split('$');
  if (prefix !== 'pbkdf2') return false;
  const rounds = parseInt(roundsStr, 10);
  const keyBuf = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(plain)), { name: 'PBKDF2' }, false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: fromB64(saltB64), iterations: rounds, hash: 'SHA-256' },
    keyBuf,
    KEY_LEN * 8
  );
  const candidate = toB64(bits);
  const expected = hashB64;
  // Constant-time compare.
  if (candidate.length !== expected.length) return false;
  let result = 0;
  for (let i = 0; i < candidate.length; i++) result |= candidate.charCodeAt(i) ^ expected.charCodeAt(i);
  return result === 0;
}

export { hashPassword, verifyPassword };

export function signToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

export function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing authentication token.' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions.' });
    }
    next();
  };
}

/**
 * Permission gate. A user is allowed if they are superadmin OR they hold a
 * role whose permissions array includes the required permission.
 */
export function checkPermission(...permissions) {
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
    // Superadmin has access to everything.
    if (req.user.role === 'superadmin') return next();

    // Load the user's assigned roles and their permissions.
    const assignments = await db.prepare(`
      SELECT r.permissions FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.user_id = ?
    `).all(req.user.id);

    const has = assignments.some((a) => {
      let perms = [];
      try { perms = JSON.parse(a.permissions || '[]'); } catch { perms = []; }
      return permissions.some((p) => perms.includes(p));
    });

    if (!has) return res.status(403).json({ error: 'Insufficient permissions.' });
    next();
  };
}
