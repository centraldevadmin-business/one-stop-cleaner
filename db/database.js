import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve the DB path lazily so that setting process.env.DB_PATH at runtime
// (e.g. in the test suite) takes effect. The default is the real app database.
function resolveDbPath() {
  return process.env.DB_PATH || path.join(__dirname, '..', 'data', 'app.db');
}

// Ensure the data directory exists for the real database file.
function ensureDataDir() {
  const dir = path.dirname(resolveDbPath());
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Lazily construct the SQLite connection. Using a Proxy keeps every existing
// `import db from '../db/database.js'` usage working unchanged while deferring
// connection creation until the first access.
let _db = null;
const db = new Proxy({}, {
  get(_target, prop) {
    if (! _db) {
      ensureDataDir();
      _db = new Database(resolveDbPath());
      _db.pragma('journal_mode = WAL');
      _db.pragma('foreign_keys = ON');
    }
    return _db[prop];
  },
  set(_target, prop, value) {
    if (!_db) {
      ensureDataDir();
      _db = new Database(resolveDbPath());
      _db.pragma('journal_mode = WAL');
      _db.pragma('foreign_keys = ON');
    }
    _db[prop] = value;
    return true;
  },
  has(_target, prop) {
    return prop in (_db || {});
  },
  ownKeys() {
    return _db ? Reflect.ownKeys(_db) : [];
  },
  getOwnPropertyDescriptor() {
    return { enumerable: true, configurable: true };
  },
});

/**
 * Run the schema. Idempotent — safe to run on every start.
 */
export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'agent',   -- superadmin | agent
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL DEFAULT 'contact',   -- contact | waitlist | partner | service | product
      status TEXT NOT NULL DEFAULT 'new',       -- new | contacted | qualified | lost
      stage TEXT NOT NULL DEFAULT 'discovery',  -- discovery | proposal | negotiation | won | lost
      priority TEXT NOT NULL DEFAULT 'normal',  -- low | normal | high
      name TEXT,
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
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      channel TEXT NOT NULL,       -- email | sms | push | ad
      audience TEXT NOT NULL DEFAULT 'all',   -- all | waitlist | clients | cleaners | partners
      status TEXT NOT NULL DEFAULT 'draft',   -- draft | scheduled | running | completed
      subject TEXT,
      body TEXT,
      scheduled_at TEXT,
      sent_at TEXT,
      recipients INTEGER NOT NULL DEFAULT 0,
      opened INTEGER NOT NULL DEFAULT 0,
      clicked INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS campaign_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER NOT NULL,
      event TEXT NOT NULL,   -- sent | opened | clicked
      count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS content_blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,      -- e.g. hero_headline, home_mission
      title TEXT NOT NULL,
      body TEXT,
      media_url TEXT,
      position INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,        -- starter_kit | refill | consumable
      description TEXT,
      price REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'AUD',
      image_url TEXT,
      in_stock INTEGER NOT NULL DEFAULT 0,
      position INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS analytics_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_name TEXT NOT NULL,      -- page_view | waitlist_signup | contact_submit | partner_inquiry | product_inquiry
      page TEXT,
      value REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'image',   -- image | video
      url TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  return db;
}

export default db;
