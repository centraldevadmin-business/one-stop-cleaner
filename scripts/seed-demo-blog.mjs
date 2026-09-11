// Seed demo blog posts into the local SQLite database.
// Run with: node scripts/seed-demo-blog.mjs
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'app.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

const posts = [
  {
    slug: 'launching-in-australia',
    title: 'We\'re launching in Australia',
    excerpt: 'One Stop Cleaner is coming to Australia. Join the waitlist to be first in line for vetted, insured cleaners with escrow-secured payments.',
    body: `We're thrilled to announce that One Stop Cleaner is preparing to launch across Australia.

For years, finding a reliable cleaner has meant relying on word-of-mouth, sketchy listings, or apps that take a huge cut of your hard-earned money. We're changing that.

**What to expect at launch:**

- **Vetted & insured cleaners** — every cleaner on our platform goes through identity checks, reference verification, and is covered by insurance for peace of mind.
- **Escrow-secured payments** — your money is held safely and only released once you're happy with the completed work. No upfront risk.
- **Transparent pricing** — you see the full price before you book. No hidden fees, no surprises.
- **City-by-city rollout** — we're starting in Sydney and Melbourne, then expanding to Brisbane, Perth, and Adelaide.

**How to get early access:**

Join the waitlist on our site and you'll be first in line when we launch in your city. Waitlist members get priority booking and an exclusive launch-day discount.

We can't wait to make cleaning your home simpler, safer, and more affordable.`,
    cover_url: 'media/new_team.jpg',
    category: 'Launch',
    author: 'One Stop Cleaner Team',
    status: 'published',
    position: 1,
  },
  {
    slug: 'escrow-secured-payments-explained',
    title: 'How escrow-secured payments keep you safe',
    excerpt: 'Every payment on One Stop Cleaner is held safely in escrow and only released once you\'re happy with the work. Here\'s how it works.',
    body: `When you book a cleaner through a stranger, trust is everything. That's why every payment on One Stop Cleaner is held safely in escrow.

**What is escrow?**

Escrow is a secure financial process where a third party holds your payment until both you and the cleaner are satisfied with the outcome. Think of it as a safety net that protects everyone.

**The step-by-step process:**

1. **You book & pay** — When you book a cleaner, the payment is authorized but not sent to the cleaner yet. It's held securely in escrow.
2. **The cleaner does the job** — Your home gets cleaned to your expectations.
3. **You approve** — Once you're happy with the work, you confirm completion.
4. **Payment is released** — Only then does the money go to the cleaner.

**Why this matters:**

- **No upfront risk for you** — if the cleaner doesn't show up or does a poor job, your money is still safe.
- **Fair for cleaners too** — they know the payment is guaranteed and secured, so there's no chasing for money owed.
- **Dispute protection** — if something goes wrong, our team helps mediate a fair resolution.

Security isn't a luxury — it's the foundation of a marketplace people can trust.`,
    cover_url: 'media/real-clean-living-room.jpg',
    category: 'Platform',
    author: 'One Stop Cleaner Team',
    status: 'published',
    position: 2,
  },
  {
    slug: 'grow-your-cleaning-business',
    title: 'Grow your cleaning business with One Stop Cleaner',
    excerpt: 'Whether you work solo or run a team, One Stop Cleaner connects you with ready-to-book clients in your area. Set your own prices and get paid securely.',
    body: `Whether you're a solo cleaner just starting out or a cleaning company looking to scale, finding consistent work is the hardest part of the business. One Stop Cleaner is built to solve that.

**How it works for cleaners:**

- **Create your profile** — Tell clients about your services, experience, and areas you serve.
- **Set your own prices** — You're in control. We never dictate what you charge.
- **Get matched with clients** — When someone in your area needs a cleaner, your profile comes up.
- **Get paid securely** — Payments are held in escrow and released when the job is done. No more waiting weeks to get paid.

**For cleaning companies:**

- **Manage your team** — Add multiple cleaners to one account and coordinate bookings.
- **Scale without the overhead** — We handle marketing, bookings, and payments so you can focus on the cleaning.
- **Get paid on time** — Every job is secured, so cash flow stays predictable.

**Why cleaners choose us:**

Unlike other platforms that take 20-30% of every job, we keep our fees low so more of what you earn stays in your pocket. You set your terms, your hours, and your rates.

Ready to grow your business? Join the waitlist and be first in line.

We can't wait to help you grow.`,
    cover_url: 'media/real-clean-living-room.jpg',
    category: 'Community',
    author: 'One Stop Cleaner Team',
    status: 'published',
    position: 3,
  },
  {
    slug: 'how-to-book-a-cleaner-with-confidence',
    title: 'How to book a cleaner with confidence',
    excerpt: 'A practical guide to finding, vetting, and booking a cleaner you can trust — whether it\'s your first time or your tenth.',
    body: `Booking a cleaner for your home is a decision built on trust. Here's how One Stop Cleaner makes it easy to do with confidence.

**1. Check the vetting**

Every cleaner on One Stop Cleaner goes through identity verification, reference checks, and background screening. You'll see this badge on their profile so you know they've been verified.

**2. Read real reviews**

Our reviews come from verified clients who actually booked that cleaner. Look for patterns in the feedback — consistency matters more than any single review.

**3. Review the scope clearly**

Before you book, make sure the cleaning scope is clear. List the rooms, any special requests, and things that need extra attention. Clear communication means a cleaner can give you an accurate quote.

**4. Use escrow payments**

Because payments are held in escrow, you're protected until the work is done and you're happy. There's no reason to pay upfront.

**5. Be available for the walkthrough**

If you can, be home when the cleaner arrives. A quick walkthrough ensures they know exactly what you want, and it builds a good working relationship from day one.

Booking a cleaner shouldn't be stressful. With the right platform, it's quick, safe, and affordable.`,
    cover_url: 'media/real-clean-floor.jpg',
    category: 'Guide',
    author: 'One Stop Cleaner Team',
    status: 'published',
    position: 4,
  },
  {
    slug: 'signs-you-need-a-professional-cleaner',
    title: '5 signs you need a professional cleaner',
    excerpt: 'Sometimes a deeper clean is exactly what your home needs. Here are the clearest signs it\'s time to bring in the professionals.',
    body: `We all know when our home could use a hand — but sometimes it's hard to tell when it's time to bring in a professional. Here are five clear signs.

**1. You keep putting it off**

If chores like cleaning the oven, washing the windows, or scrubbing the tiles keep landing at the bottom of your to-do list, you probably don't have the time or energy. That's exactly what professionals are for.

**2. Allergies are acting up**

Dust, pet dander, and mold can quietly make your home less healthy. A professional clean reaches spots regular cleaning misses — and can make a real difference for allergy sufferers.

**3. You've got guests coming**

Family visiting? A night out with friends? A professional clean before guests arrive means you can relax instead of stressing about every surface.

**4. Moving in or out**

Moving is stressful enough. A deep clean for a new home or a vacating property ensures every corner is handled — and can help you get your bond back.

**5. Life gets busy**

New job, new baby, a health setback — life happens. When you're stretched thin, outsourcing the cleaning frees up your time for what matters most.

Finding a trusted cleaner has never been easier. One Stop Cleaner connects you with vetted, insured professionals in minutes.`,
    cover_url: 'media/real-clean-floor.jpg',
    category: 'Guide',
    author: 'One Stop Cleaner Team',
    status: 'published',
    position: 5,
  },
];

const stmt = db.prepare(`
  INSERT INTO blog_posts (slug, title, excerpt, body, cover_url, category, author, status, published_at, position, created_at, updated_at)
  VALUES (@slug, @title, @excerpt, @body, @cover_url, @category, @author, @status, datetime('now'), @position, datetime('now'), datetime('now'))
`);

const existing = db.prepare('SELECT COUNT(*) as count FROM blog_posts').get();
if (existing.count > 0) {
  console.log(`Found ${existing.count} existing posts. Skipping seed to avoid duplicates.`);
  db.close();
  process.exit(0);
}

const tx = db.transaction(() => {
  for (const p of posts) {
    stmt.run(p);
  }
});
tx();

const total = db.prepare('SELECT COUNT(*) as count FROM blog_posts').get().count;
console.log(`Seeded ${posts.length} demo blog posts. Total posts: ${total}`);

db.close();
