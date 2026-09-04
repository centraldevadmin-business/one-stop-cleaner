-- Full reset + seed for remote D1 database (One Stop Cleaner)
-- Run with: npx wrangler d1 execute one-stop-cleaner-db --remote --file scripts/seed-d1.sql

DROP TABLE IF EXISTS campaign_stats;
DROP TABLE IF EXISTS campaigns;
DROP TABLE IF EXISTS leads;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS content_blocks;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS analytics_events;
DROP TABLE IF EXISTS media;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'agent',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL DEFAULT 'contact',
  status TEXT NOT NULL DEFAULT 'new',
  stage TEXT NOT NULL DEFAULT 'discovery',
  priority TEXT NOT NULL DEFAULT 'normal',
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
);

CREATE TABLE IF NOT EXISTS campaign_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER NOT NULL,
  event TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS content_blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
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
  category TEXT NOT NULL,
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
  event_name TEXT NOT NULL,
  page TEXT,
  value REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'image',
  url TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Users (passwords: admin123 / agent123)
INSERT INTO users (name, email, password_hash, role, active, created_at) VALUES
('Super Admin', 'admin@onestopcleaner.com', '$2a$10$9t9rtUn16qVrqsu.6Yany.pogR1BllVc8tzbQ53g8M4x/NeyBNPgu', 'superadmin', 1, datetime('now'));
INSERT INTO users (name, email, password_hash, role, active, created_at) VALUES
('Sales Agent', 'agent@onestopcleaner.com', '$2a$10$dpGVxc5u7dGtHGMTk6Nm2OdDEuMeCi4RUj/A7dK9sI8UjJ22rw0Me', 'agent', 1, datetime('now'));

-- Sample leads
INSERT INTO leads (source, status, stage, priority, name, email, phone, company, message, city, service_type, notes, assigned_to, created_at, updated_at) VALUES
('contact', 'new', 'discovery', 'high', 'Emma Wilson', 'emma.w@example.com', '0400 000 001', NULL, 'Need weekly home cleaning in Sydney.', 'Sydney', 'home_cleaning', NULL, NULL, datetime('now'), datetime('now')),
('waitlist', 'new', 'discovery', 'normal', 'James Lee', 'james.l@example.com', NULL, NULL, 'Sign up for the waitlist.', 'Melbourne', NULL, NULL, NULL, datetime('now'), datetime('now')),
('partner', 'contacted', 'proposal', 'high', 'Sparkle Co', 'hello@sparkleco.com', '0400 000 002', 'Sparkle Co', 'We supply eco-friendly cleaning products and want to partner.', 'Australia', NULL, NULL, 'Product supplier interest', datetime('now'), datetime('now')),
('service', 'qualified', 'negotiation', 'normal', 'Olivia Brown', 'olivia.b@example.com', '0400 000 003', 'Brown Office', 'Office cleaning for 120sqm clinic.', 'Brisbane', 'office', NULL, NULL, datetime('now'), datetime('now')),
('product', 'new', 'discovery', 'low', 'Liam Taylor', 'liam.t@example.com', NULL, NULL, 'Interested in the starter kit.', 'Perth', NULL, NULL, NULL, datetime('now'), datetime('now')),
('contact', 'lost', 'lost', 'normal', 'Ava Martin', 'ava.m@example.com', NULL, NULL, 'Got a competitor quote.', 'Adelaide', NULL, NULL, 'Lost to competitor on price', datetime('now'), datetime('now'));

-- Content blocks
INSERT INTO content_blocks (key, title, body, media_url, position, active) VALUES
('hero_headline', 'Hero headline', 'Trusted cleaning, <br>one stop away.', NULL, 0, 1),
('home_mission', 'Home mission', 'We connect you with verified local cleaners and the products they use.', NULL, 1, 1);

-- Products
INSERT INTO products (name, category, description, price, currency, image_url, in_stock, position, active) VALUES
('Starter Kit', 'starter_kit', 'Everything to start clean: multi-surface cleaner, microfiber cloths, sponges, gloves.', 49, 'AUD', NULL, 1, 0, 1),
('Multi-Surface Refill', 'refill', 'Professional-grade multi-surface cleaner refill bottle.', 18, 'AUD', NULL, 1, 1, 1),
('Microfiber Cloth 3-Pack', 'consumable', 'Reusable microfiber cloths for every surface.', 15, 'AUD', NULL, 1, 2, 1);
