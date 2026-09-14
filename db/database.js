import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';

// These are only needed on Node (to resolve the on-disk DB path and to
// `require` better-sqlite3). `import.meta.url` is undefined on Workers, so
// guard everything behind the Workers check.
const isWorkersRuntime =
  typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers';

let __dirname = null;
let require = null;
if (!isWorkersRuntime) {
  __dirname = path.dirname(fileURLToPath(import.meta.url));
  require = createRequire(import.meta.url);
}

// ---------------------------------------------------------------------------
// Environment-aware data layer.
//
//   * Node / tests  -> better-sqlite3 (synchronous native SQLite).
//   * Cloudflare    -> D1 binding (async).
//
// Both backends are exposed through ONE unified interface so the route files
// never change their SQL. Route handlers `await` every call, which works for
// both sync (Node) and async (Workers) results.
// ---------------------------------------------------------------------------

let _nodeDb = null; // better-sqlite3 instance (Node)
let _d1 = null; // D1 binding (Workers)

export { _d1, _nodeDb };

function isWorkers() {
  // Cloudflare Workers: no `process` object, but a Workers `navigator`.
  if (typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers') return true;
  // Node with the worker runtime flag (rare).
  if (typeof process !== 'undefined' && !!process.versions?.worker) return true;
  return false;
}

function resolveDbPath() {
  return process.env.DB_PATH || path.join(__dirname, '..', 'data', 'app.db');
}

function ensureDataDir() {
  const dir = path.dirname(resolveDbPath());
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/**
 * Run the schema. Idempotent — safe to run on every start.
 *
 * D1's `exec()` does not handle multi-statement strings, so we split the
 * schema into individual statements and run them one at a time.
 */
export async function runSchema(nodeDb, d1) {
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'agent',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL DEFAULT 'contact',
      status TEXT NOT NULL DEFAULT 'new',
      stage TEXT NOT NULL DEFAULT 'discovery',
      priority TEXT NOT NULL DEFAULT 'normal',      segment TEXT NOT NULL DEFAULT 'general',      name TEXT,
      email TEXT,
      phone TEXT,
      company TEXT,
      message TEXT,
      city TEXT,
      service_type TEXT,
      notes TEXT,
      assigned_to TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      channel TEXT NOT NULL,
      audience TEXT NOT NULL DEFAULT 'all',
      status TEXT NOT NULL DEFAULT 'draft',
      subject TEXT,
      body TEXT,
      scheduled_at TEXT,
      sent_at TEXT,
      recipients INTEGER NOT NULL DEFAULT 0,
      opened INTEGER NOT NULL DEFAULT 0,
      clicked INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS campaign_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER NOT NULL,
      event TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS content_blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      body TEXT,
      media_url TEXT,
      position INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'AUD',
      image_url TEXT,
      in_stock INTEGER NOT NULL DEFAULT 0,
      position INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS analytics_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_name TEXT NOT NULL,
      page TEXT,
      value REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'image',
      url TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL DEFAULT 'general',
      name TEXT,
      email TEXT,
      phone TEXT,
      company TEXT,
      interest TEXT,
      message TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      priority TEXT NOT NULL DEFAULT 'normal',
      assigned_to TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ref TEXT NOT NULL UNIQUE,
      subject TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'general',
      priority TEXT NOT NULL DEFAULT 'normal',
      status TEXT NOT NULL DEFAULT 'open',
      requester_name TEXT,
      requester_email TEXT,
      message TEXT,
      assigned_to TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS ticket_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL,
      author_name TEXT,
      author_email TEXT,
      author_role TEXT NOT NULL DEFAULT 'customer',
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS blog_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      excerpt TEXT,
      body TEXT,
      cover_url TEXT,
      category TEXT NOT NULL DEFAULT 'news',
      author TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      published_at TEXT,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      label TEXT,
      permissions TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS role_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      role_id INTEGER NOT NULL,
      assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_id INTEGER,
      actor_name TEXT,
      actor_role TEXT,
      action TEXT NOT NULL,
      target TEXT,
      detail TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS legal_pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      body TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      link TEXT,
      style TEXT NOT NULL DEFAULT 'info',
      active INTEGER NOT NULL DEFAULT 1,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  ];

  if (d1) {
    // D1's exec() does not handle multi-statement strings; run each one.
    for (const sql of statements) {
      console.error('SCHEMA SQL:', JSON.stringify(sql).slice(0, 80));
      await d1.prepare(sql).run();
    }
    return;
  }
  // better-sqlite3 supports multi-statement strings.
  nodeDb.exec(statements.join(';\n'));
}

// ---------------------------------------------------------------------------
// Node backend setup (better-sqlite3, synchronous).
// ---------------------------------------------------------------------------
async function ensureNodeDb() {
  if (_nodeDb) return _nodeDb;
  // Dynamic import with a computed specifier so the Workers bundler (esbuild)
  // cannot resolve / bundle the native module. It is only ever loaded in Node.
  const modName = 'better' + '-sqlite3';
  const Database = (await import(modName)).default;
  ensureDataDir();
  _nodeDb = new Database(resolveDbPath());
  _nodeDb.pragma('journal_mode = WAL');
  _nodeDb.pragma('foreign_keys = ON');
  return _nodeDb;
}

// ---------------------------------------------------------------------------
// Unified async interface.
// ---------------------------------------------------------------------------
function makeStmt(sql) {
  return {
    // D1 returns { row, count, last_insert_rowid, changed }; better-sqlite3
    // returns the row directly. Unwrap to a single unified shape.
    get: async (...params) => {
      if (_d1) {
        const r = await _d1.prepare(sql).get(...params);
        return r ? r.row : undefined;
      }
      const nodeDb = await ensureNodeDb();
      return nodeDb.prepare(sql).get(...params);
    },
    all: async (...params) => {
      if (_d1) {
        const r = await _d1.prepare(sql).all(...params);
        return r ? r.results : [];
      }
      const nodeDb = await ensureNodeDb();
      return nodeDb.prepare(sql).all(...params);
    },
    run: async (...params) => {
      if (_d1) {
        const r = await _d1.prepare(sql).run(...params);
        return { lastInsertRowid: r.last_insert_rowid, changes: r.changed };
      }
      const nodeDb = await ensureNodeDb();
      return nodeDb.prepare(sql).run(...params);
    },
  };
}

const db = {
  prepare(sql) {
    return makeStmt(sql);
  },
  exec: async (sql) => {
    if (_d1) return _d1.exec(sql);
    const nodeDb = await ensureNodeDb();
    return nodeDb.exec(sql);
  },
};

/**
 * Workers entry point. Called from worker.js with the Cloudflare `env`.
 */
export async function init(env = {}) {
  // Binding-driven detection: if a D1 binding is present in `env`, we are on
  // Cloudflare Workers and must use D1. This is far more reliable than
  // checking `navigator.userAgent`, which can be unreliable at module-load
  // time. If no D1 binding is present, fall back to better-sqlite3 (Node).
  const d1Binding = env.D1_DATABASE || env.one_stop_cleaner_db || env.DB;
  if (d1Binding) {
    _d1 = d1Binding;
    await runSchema(null, _d1);
  }
  return db;
}

/**
 * Node / tests entry point. Sets up better-sqlite3 synchronously so the test
 * suite (which does not await initDb) still has a ready database.
 */
export function initDb() {
  if (_nodeDb) return _nodeDb;
  const Database = require('better-sqlite3');
  ensureDataDir();
  _nodeDb = new Database(resolveDbPath());
  _nodeDb.pragma('journal_mode = WAL');
  _nodeDb.pragma('foreign_keys = ON');
  runSchema(_nodeDb, null);
  // Migrate: add columns that may be missing from pre-existing databases.
  const cols = _nodeDb.prepare('PRAGMA table_info(leads)').all().map((c) => c.name);
  if (!cols.includes('segment')) {
    _nodeDb.exec('ALTER TABLE leads ADD COLUMN segment TEXT NOT NULL DEFAULT \'general\'');
  }
  // Migrate: add SEO columns that may be missing from pre-existing databases.
  const blogCols = _nodeDb.prepare('PRAGMA table_info(blog_posts)').all().map((c) => c.name);
  if (!blogCols.includes('meta_title')) {
    _nodeDb.exec("ALTER TABLE blog_posts ADD COLUMN meta_title TEXT");
  }
  if (!blogCols.includes('meta_description')) {
    _nodeDb.exec("ALTER TABLE blog_posts ADD COLUMN meta_description TEXT");
  }
  return _nodeDb;
}

export default db;
