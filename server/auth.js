import db from '../db/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
// For simplicity in our custom implementation, we just store expiry directly in the payload
const JWT_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000; 

// ---------------------------------------------------------------------------
// Password hashing — Web Crypto (PBKDF2), works on BOTH Node and Cloudflare
// Workers. bcryptjs uses a synchronous busy-loop that hangs the Workers
// runtime, so we can't use it in production.
// ---------------------------------------------------------------------------

const PBKDF2_ROUNDS = 10000;
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

// ---------------------------------------------------------------------------
// Custom Lightweight Token implementation (Web Crypto API)
// ---------------------------------------------------------------------------
function toB64Url(u8) {
  return btoa(String.fromCharCode(...u8)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64Url(str) {
  let s = str.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}
async function getHmacKey() {
  return await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']
  );
}

export async function signToken(user) {
  const header = toB64Url(new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const payloadData = { id: user.id, name: user.name, email: user.email, role: user.role, exp: Date.now() + JWT_EXPIRES_MS };
  const payload = toB64Url(new TextEncoder().encode(JSON.stringify(payloadData)));
  const data = header + '.' + payload;
  const sigBuffer = await crypto.subtle.sign('HMAC', await getHmacKey(), new TextEncoder().encode(data));
  return data + '.' + toB64Url(new Uint8Array(sigBuffer));
}

export async function verifyToken(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token');
  const data = parts[0] + '.' + parts[1];
  const isValid = await crypto.subtle.verify('HMAC', await getHmacKey(), fromB64Url(parts[2]), new TextEncoder().encode(data));
  if (!isValid) throw new Error('Invalid signature');
  const payload = JSON.parse(new TextDecoder().decode(fromB64Url(parts[1])));
  if (Date.now() > payload.exp) throw new Error('Token expired');
  return payload;
}

export async function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing authentication token.' });
  try {
    req.user = await verifyToken(token);
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
