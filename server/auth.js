import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_EXPIRES = '7d';

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

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
