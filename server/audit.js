import db from '../db/database.js';

/**
 * Record an audit-log entry for admin actions. Never throws — audit logging
 * must never break the request that triggered it.
 */
export async function audit(req, action, target, detail = '') {
  try {
    const actor = req.user || {};
    await db.prepare('INSERT INTO audit_logs (actor_id, actor_name, actor_role, action, target, detail) VALUES (?, ?, ?, ?, ?, ?)')
      .run(
        actor.id || null,
        actor.name || null,
        actor.role || null,
        action,
        String(target),
        detail
      );
  } catch {
    // ignore audit failures
  }
}

// List audit logs — admin only (superadmin by default via requireRole in server)
export async function listAuditLogs({ actor_role, action, limit = 200 } = {}) {
  let sql = 'SELECT * FROM audit_logs WHERE 1=1';
  const params = [];
  if (actor_role) { sql += ' AND actor_role = ?'; params.push(actor_role); }
  if (action) { sql += ' AND action = ?'; params.push(action); }
  sql += ' ORDER BY rowid DESC LIMIT ?';
  params.push(Number(limit) || 200);
  return await db.prepare(sql).all(...params);
}
