import bcrypt from 'bcryptjs';
import db from '../db/database.js';
import { initDb } from '../db/database.js';

initDb();

// bcrypt.hash is async; wrap it in a promise so we can await it.
function hash(plain) {
  return new Promise((resolve, reject) => {
    bcrypt.hash(plain, 10, (err, h) => (err ? reject(err) : resolve(h)));
  });
}

async function main() {
  const superAdminHash = await hash('admin123');
  const agentHash = await bcrypt.hash('agent123', 10);

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
  .then(() => { db.close(); process.exit(0); })
  .catch((e) => { console.error(e); process.exit(1); });
