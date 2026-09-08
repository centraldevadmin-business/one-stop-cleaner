import db from '../db/database.js';
import { initDb } from '../db/database.js';
import { hashPassword } from '../server/auth.js';

// initDb() returns the better-sqlite3 instance, which has a `close()` method.
// The module-level `db` export is a thin wrapper without it.
const dbConn = initDb();

async function main() {
  const superAdminHash = await hashPassword('admin123');
  const agentHash = await hashPassword('agent123');

  // Admins
  db.prepare('DELETE FROM users').run();
  db.prepare('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)')
    .run('Super Admin', 'admin@onestopcleaner.com', superAdminHash, 'superadmin');
  db.prepare('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)')
    .run('Sales Agent', 'agent@onestopcleaner.com', agentHash, 'agent');

  // Sample leads
  db.prepare('DELETE FROM leads').run();
  const sampleLeads = [
    ['contact', 'new', 'discovery', 'high', 'Emma Wilson', 'emma.w@example.com', '0400 000 001', null, 'Need weekly home cleaning in Sydney.', 'Sydney', 'home_cleaning', null, null],
    ['waitlist', 'new', 'discovery', 'normal', 'James Lee', 'james.l@example.com', null, null, 'Sign up for the waitlist.', 'Melbourne', null, null, null],
    ['partner', 'contacted', 'proposal', 'high', 'Sparkle Co', 'hello@sparkleco.com', '0400 000 002', 'Sparkle Co', 'We supply eco-friendly cleaning products and want to partner.', 'Australia', null, null, 'Product supplier interest'],
    ['service', 'qualified', 'negotiation', 'normal', 'Olivia Brown', 'olivia.b@example.com', '0400 000 003', 'Brown Office', 'Office cleaning for 120sqm clinic.', 'Brisbane', 'office', null, null],
    ['product', 'new', 'discovery', 'low', 'Liam Taylor', 'liam.t@example.com', null, null, 'Interested in the starter kit.', 'Perth', null, null, null],
    ['contact', 'lost', 'lost', 'normal', 'Ava Martin', 'ava.m@example.com', null, null, 'Got a competitor quote.', 'Adelaide', null, null, 'Lost to competitor on price'],
  ];
  const insertLead = db.prepare('INSERT INTO leads (source,status,stage,priority,name,email,phone,company,message,city,service_type,notes,assigned_to) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');
  sampleLeads.forEach((l) => insertLead.run(...l));

  // Content blocks
  db.prepare('DELETE FROM content_blocks').run();
  const blocks = [
    ['hero_headline', 'Hero headline', 'Trusted cleaning, <br>one stop away.', null, 0, 1],
    ['home_mission', 'Home mission', 'We connect you with verified local cleaners and the products they use.', null, 1, 1],
  ];
  const insertBlock = db.prepare('INSERT INTO content_blocks (key,title,body,media_url,position,active) VALUES (?,?,?,?,?,?)');
  blocks.forEach((b) => insertBlock.run(...b));

  // Products
  db.prepare('DELETE FROM products').run();
  const products = [
    ['Starter Kit', 'starter_kit', 'Everything to start clean: multi-surface cleaner, microfiber cloths, sponges, gloves.', 49, 1],
    ['Multi-Surface Refill', 'refill', 'Professional-grade multi-surface cleaner refill bottle.', 18, 1],
    ['Microfiber Cloth 3-Pack', 'consumable', 'Reusable microfiber cloths for every surface.', 15, 1],
  ];
  const insertProduct = db.prepare('INSERT INTO products (name,category,description,price,currency,image_url,in_stock,position,active) VALUES (?,?,?,?,?,?,?,?,?)');
  products.forEach((p) => insertProduct.run(p[0], p[1], p[2], p[3], 'AUD', null, p[4], 0, 1));

  // Campaigns
  db.prepare('DELETE FROM campaign_stats').run();
  db.prepare('DELETE FROM campaigns').run();
  const campaigns = [
    ['Launch announcement', 'email', 'all', 'running', 'We are launching soon!', 'One Stop Cleaner is coming to your city. Book with verified cleaners today.', null, null, 0, 0, 0],
    ['Product launch', 'email', 'waitlist', 'draft', 'New products available', 'Shop professional cleaning products — starter kits and refills.', null, null, 0, 0, 0],
  ];
  const insertCampaign = db.prepare('INSERT INTO campaigns (name,channel,audience,status,subject,body,scheduled_at,sent_at,recipients,opened,clicked) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
  campaigns.forEach((c) => insertCampaign.run(...c));

  // Roles (RBAC)
  db.prepare('DELETE FROM role_assignments').run();
  db.prepare('DELETE FROM roles').run();
  const roles = [
    ['superadmin', 'Super Admin', ['dashboard','leads','contacts','tickets','blog','cms','products','campaigns','users','roles','audit']],
    ['agent', 'Sales Agent', ['dashboard','leads','contacts','tickets','blog','cms','products','campaigns']],
    ['support', 'Support Agent', ['dashboard','contacts','tickets']],
    ['content', 'Content Editor', ['dashboard','blog','cms','media']],
    ['analyst', 'Analyst', ['dashboard','analytics','audit']],
  ];
  const insertRole = db.prepare('INSERT INTO roles (name, label, permissions) VALUES (?, ?, ?)');
  roles.forEach((r) => insertRole.run(r[0], r[1], JSON.stringify(r[2])));

  // Blog posts
  db.prepare('DELETE FROM blog_posts').run();
  const posts = [
    ['how-to-choose-a-verified-cleaner', 'How to Choose a Verified Cleaner You Can Trust',
      'Not sure what "verified" really means? Here's what we check before a cleaner joins One Stop Cleaner.',
      '<p>Trust is the foundation of every booking. When you open your door to a stranger, you deserve to know who is on the other side of it.</p><h2>What "verified" actually means</h2><p>Every cleaner and cleaning company on One Stop Cleaner goes through an identity check, a background check where available, and a skills verification. We do not skip these steps, even when demand is high.</p><h2>Signs of a trustworthy cleaner</h2><ul><li>A complete, verified profile with real reviews</li><li>Clear pricing and no hidden fees</li><li>Professional equipment and products</li><li>Responsive to questions before you book</li></ul><p>Book verified cleaners through One Stop Cleaner and every payment is held in escrow until the job is done right.</p>',
      'media/new_hero-house.jpg', 'guide', 'One Stop Cleaner', 'published', 0],
    ['5-tips-keep-your-home-fresh-between-cleans', '5 Tips to Keep Your Home Fresh Between Cleans',
      'Simple, practical habits that stretch the time between professional cleans.',
      '<p>A regular clean is great, but a few small habits can keep your home feeling fresh for longer.</p><h2>1. Quick 10-minute tidy</h2><p>Set a timer and tidy the most-used rooms each evening. It keeps clutter from piling up.</p><h2>2. Wipe surfaces daily</h2><p>Kitchen and bathroom surfaces gather grime fast. A quick wipe after use makes a big difference.</p><h2>3. Ventilate your home</h2><p>Opening windows for a few minutes a day refreshes the air and reduces moisture.</p><h2>4. Deal with shoes at the door</h2><p>A mat and a no-shoes rule stops dirt from spreading room to room.</p><h2>5. Reorder what you love</h2><p>If a product worked on your last clean, reorder it. Starter kits and refills ship straight to your door.</p>',
      'media/new_clean-gloves.jpg', 'tips', 'One Stop Cleaner', 'published', 1],
    ['grow-your-cleaning-business-with-one-stop', 'How to Grow Your Cleaning Business with One Stop Cleaner',
      'Whether you work alone or run a team, here is how to get found by clients ready to book.',
      '<p>Getting found by the right clients is the hardest part of a cleaning business. One Stop Cleaner is built to solve that.</p><h2>Set up a verified profile</h2><p>A complete, verified profile stands out. Add your services, service area, hours, and before/after photos.</p><h2>Set your own terms</h2><p>You control your prices, availability, and how far you travel. No forced schedules.</p><h2>Get paid securely</h2><p>Payment is held safely in escrow and released when the job is done right, so you always get paid for the work you do.</p><p>Grow your cleaning business with us today.</p>',
      'media/cleaner2.jpg', 'business', 'One Stop Cleaner', 'published', 2],
    ['understanding-escrow-and-safe-payments', 'Understanding Escrow and Safe Payments',
      'How escrow protects both clients and cleaners on One Stop Cleaner.',
      '<p>Escrow is the mechanism that makes trusted online marketplaces possible. Here is how it works in simple terms.</p><h2>Money is held safely</h2><p>When you book and pay, the funds are held in a protected account — not released to the cleaner immediately.</p><h2>Released when you are happy</h2><p>Once the job is complete and you are satisfied, the funds are released. You only pay for work you are happy with.</p><h2>Protection for everyone</h2><p>Cleaners know they will be paid. Clients know their money is safe until the work is done. Everyone can proceed with confidence.</p>',
      'media/living-room.jpg', 'guide', 'One Stop Cleaner', 'published', 3],
  ];
  const insertPost = db.prepare('INSERT INTO blog_posts (slug,title,excerpt,body,cover_url,category,author,status,position) VALUES (?,?,?,?,?,?,?, ?,?)');
  posts.forEach((p) => insertPost.run(...p));

  // Analytics events
  db.prepare('DELETE FROM analytics_events').run();
  const events = [
    ['page_view', '/', 0], ['waitlist_signup', '/contact', 0], ['contact_submit', '/contact', 0],
    ['partner_inquiry', '/contact', 0], ['page_view', '/services', 0], ['page_view', '/products', 0],
  ];
  const insertEvent = db.prepare('INSERT INTO analytics_events (event_name,page,value) VALUES (?,?,?)');
  events.forEach((e) => insertEvent.run(...e));

  console.log('Seed complete.');
  console.log('Superadmin login: admin@onestopcleaner.com / admin123');
  console.log('Agent login: agent@onestopcleaner.com / agent123');
}

main()
  .then(() => { dbConn.close(); process.exit(0); })
  .catch((e) => { console.error(e); process.exit(1); });
