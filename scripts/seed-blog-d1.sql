-- Create blog_posts table and seed demo articles for remote D1.
-- Run with: npx wrangler d1 execute one-stop-cleaner-db --remote --file scripts/seed-blog-d1.sql

CREATE TABLE IF NOT EXISTS blog_posts (
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
);

INSERT OR IGNORE INTO blog_posts (slug, title, excerpt, body, cover_url, category, author, status, published_at, position) VALUES
('launching-in-australia', 'We are launching in Australia', 'One Stop Cleaner is coming to Australia. Join the waitlist to be first in line for vetted, insured cleaners with escrow-secured payments.', 'We are thrilled to announce that One Stop Cleaner is preparing to launch across Australia.

For years, finding a reliable cleaner has meant relying on word-of-mouth, sketchy listings, or apps that take a huge cut of your hard-earned money. We are changing that.

What to expect at launch:

- Vetted and insured cleaners - every cleaner on our platform goes through identity checks, reference verification, and is covered by insurance for peace of mind.
- Escrow-secured payments - your money is held safely and only released once you are happy with the completed work. No upfront risk.
- Transparent pricing - you see the full price before you book. No hidden fees, no surprises.
- City-by-city rollout - we are starting in Sydney and Melbourne, then expanding to Brisbane, Perth, and Adelaide.

How to get early access:

Join the waitlist on our site and you will be first in line when we launch in your city. Waitlist members get priority booking and an exclusive launch-day discount.

We cannot wait to make cleaning your home simpler, safer, and more affordable.', 'media/new_team.jpg', 'Launch', 'One Stop Cleaner Team', 'published', datetime('now'), 1);

INSERT OR IGNORE INTO blog_posts (slug, title, excerpt, body, cover_url, category, author, status, published_at, position) VALUES
('escrow-secured-payments-explained', 'How escrow-secured payments keep you safe', 'Every payment on One Stop Cleaner is held safely in escrow and only released once you are happy with the work. Here is how it works.', 'When you book a cleaner through a stranger, trust is everything. That is why every payment on One Stop Cleaner is held safely in escrow.

What is escrow?

Escrow is a secure financial process where a third party holds your payment until both you and the cleaner are satisfied with the outcome. Think of it as a safety net that protects everyone.

The step-by-step process:

1. You book and pay - when you book a cleaner, the payment is authorized but not sent to the cleaner yet. It is held securely in escrow.
2. The cleaner does the job - your home gets cleaned to your expectations.
3. You approve - once you are happy with the work, you confirm completion.
4. Payment is released - only then does the money go to the cleaner.

Why this matters:

- No upfront risk for you - if the cleaner does not show up or does a poor job, your money is still safe.
- Fair for cleaners too - they know the payment is guaranteed and secured, so there is no chasing for money owed.
- Dispute protection - if something goes wrong, our team helps mediate a fair resolution.

Security is not a luxury - it is the foundation of a marketplace people can trust.', 'media/real-clean-living-room.jpg', 'Platform', 'One Stop Cleaner Team', 'published', datetime('now'), 2);

INSERT OR IGNORE INTO blog_posts (slug, title, excerpt, body, cover_url, category, author, status, published_at, position) VALUES
('grow-your-cleaning-business', 'Grow your cleaning business with One Stop Cleaner', 'Whether you work solo or run a team, One Stop Cleaner connects you with ready-to-book clients in your area. Set your own prices and get paid securely.', 'Whether you are a solo cleaner just starting out or a cleaning company looking to scale, finding consistent work is the hardest part of the business. One Stop Cleaner is built to solve that.

How it works for cleaners:

- Create your profile - tell clients about your services, experience, and areas you serve.
- Set your own prices - you are in control. We never dictate what you charge.
- Get matched with clients - when someone in your area needs a cleaner, your profile comes up.
- Get paid securely - payments are held in escrow and released when the job is done. No more waiting weeks to get paid.

For cleaning companies:

- Manage your team - add multiple cleaners to one account and coordinate bookings.
- Scale without the overhead - we handle marketing, bookings, and payments so you can focus on the cleaning.
- Get paid on time - every job is secured, so cash flow stays predictable.

Why cleaners choose us:

Unlike other platforms that take 20-30% of every job, we keep our fees low so more of what you earn stays in your pocket. You set your terms, your hours, and your rates.

Ready to grow your business? Join the waitlist and be first in line.', 'media/real-clean-living-room.jpg', 'Community', 'One Stop Cleaner Team', 'published', datetime('now'), 3);

INSERT OR IGNORE INTO blog_posts (slug, title, excerpt, body, cover_url, category, author, status, published_at, position) VALUES
('how-to-book-a-cleaner-with-confidence', 'How to book a cleaner with confidence', 'A practical guide to finding, vetting, and booking a cleaner you can trust - whether it is your first time or your tenth.', 'Booking a cleaner for your home is a decision built on trust. Here is how One Stop Cleaner makes it easy to do with confidence.

1. Check the vetting

Every cleaner on One Stop Cleaner goes through identity verification, reference checks, and background screening. You will see this badge on their profile so you know they have been verified.

2. Read real reviews

Our reviews come from verified clients who actually booked that cleaner. Look for patterns in the feedback - consistency matters more than any single review.

3. Review the scope clearly

Before you book, make sure the cleaning scope is clear. List the rooms, any special requests, and things that need extra attention. Clear communication means a cleaner can give you an accurate quote.

4. Use escrow payments

Because payments are held in escrow, you are protected until the work is done and you are happy. There is no reason to pay upfront.

5. Be available for the walkthrough

If you can, be home when the cleaner arrives. A quick walkthrough ensures they know exactly what you want, and it builds a good working relationship from day one.

Booking a cleaner should not be stressful. With the right platform, it is quick, safe, and affordable.', 'media/real-clean-floor.jpg', 'Guide', 'One Stop Cleaner Team', 'published', datetime('now'), 4);

INSERT OR IGNORE INTO blog_posts (slug, title, excerpt, body, cover_url, category, author, status, published_at, position) VALUES
('signs-you-need-a-professional-cleaner', '5 signs you need a professional cleaner', 'Sometimes a deeper clean is exactly what your home needs. Here are the clearest signs it is time to bring in the professionals.', 'We all know when our home could use a hand - but sometimes it is hard to tell when it is time to bring in a professional. Here are five clear signs.

1. You keep putting it off

If chores like cleaning the oven, washing the windows, or scrubbing the tiles keep landing at the bottom of your to-do list, you probably do not have the time or energy. That is exactly what professionals are for.

2. Allergies are acting up

Dust, pet dander, and mold can quietly make your home less healthy. A professional clean reaches spots regular cleaning misses - and can make a real difference for allergy sufferers.

3. You have guests coming

Family visiting? A night out with friends? A professional clean before guests arrive means you can relax instead of stressing about every surface.

4. Moving in or out

Moving is stressful enough. A deep clean for a new home or a vacating property ensures every corner is handled - and can help you get your bond back.

5. Life gets busy

New job, new baby, a health setback - life happens. When you are stretched thin, outsourcing the cleaning frees up your time for what matters most.

Finding a trusted cleaner has never been easier. One Stop Cleaner connects you with vetted, insured professionals in minutes.', 'media/real-clean-floor.jpg', 'Guide', 'One Stop Cleaner Team', 'published', datetime('now'), 5);
