const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'app.db');
const db = new Database(dbPath);

const blogs = [
  {
    title: 'The Secret to a Streak-Free Shine on Windows and Mirrors',
    slug: 'streak-free-windows-mirrors',
    status: 'published',
    category: 'Guide',
    author: 'Admin',
    cover_url: 'https://images.unsplash.com/photo-1527515637-6799059e0a24?w=800&q=80',
    excerpt: 'Tired of cloudy, streaky windows? Learn the professional techniques and homemade solutions to achieve crystal-clear glass every time.',
    body: `Getting your windows and mirrors completely streak-free can feel like an impossible task. No matter how much you wipe, the streaks seem to reappear the moment the glass dries. Here are the secrets professionals use to achieve a flawless finish.

### 1. Ditch the Paper Towels
The biggest mistake people make is using paper towels. Not only do they leave lint behind, but they also tend to push dirt around rather than absorbing it. Instead, use a high-quality microfiber cloth or a squeegee. Microfiber is designed to trap dirt and moisture without leaving any residue.

### 2. The Power of Vinegar and Water
You don't need expensive commercial glass cleaners. A simple mixture of equal parts distilled white vinegar and water is incredibly effective. The acidity in the vinegar cuts through dirt, grease, and hard water stains effortlessly. 

### 3. Choose the Right Time
Never clean your windows on a hot, sunny day. The heat will cause the cleaning solution to evaporate too quickly, leaving streaks before you even have a chance to wipe them away. Choose a cloudy day or clean when the sun is not directly shining on the glass.

### 4. The 'S' Technique
When wiping the glass, avoid scrubbing in circles. Instead, use an 'S' or 'Z' pattern, starting from the top and working your way down to the bottom. This prevents you from spreading dirt back onto the areas you've already cleaned.

With these simple changes to your routine, you'll be enjoying crystal-clear views in no time!`,
    meta_title: 'How to Clean Windows Without Streaks | One Stop Cleaner',
    meta_description: 'Discover the professional secrets to achieving perfectly streak-free windows and mirrors using simple, effective techniques.'
  },
  {
    title: 'How to Prepare Your Home for a Professional Deep Clean',
    slug: 'prepare-home-professional-deep-clean',
    status: 'published',
    category: 'Guide',
    author: 'Admin',
    cover_url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80',
    excerpt: 'Getting ready for your first professional deep clean? Follow these simple steps to ensure the cleaners can maximize their time and efficiency.',
    body: `Hiring a professional cleaning service is a great way to reset your home and take a break from household chores. To ensure you get the best possible results and value from your booking, a little bit of preparation goes a long way.

### 1. Tidy Up Clutter
Your cleaners are there to clean surfaces, not to organize your personal belongings. Pick up clothes from the floor, clear toys away, and put loose paperwork in a drawer. The less time they spend moving clutter, the more time they can spend scrubbing and sanitizing.

### 2. Secure Valuables and Fragile Items
While professional cleaners are highly trained and careful, accidents can happen. If you have delicate heirlooms or extremely valuable items on display, it’s best to put them away safely before the cleaners arrive.

### 3. Communicate Specific Needs
Don't assume the cleaners know exactly what you want. If there is a specific stain on the carpet, a delicate surface that requires special care, or a room you want them to skip, leave clear instructions. Good communication is key to a successful service.

### 4. Put Pets in a Safe Space
Even the friendliest pets can get anxious around new people and loud vacuums. For the safety and comfort of both your furry friends and the cleaning team, secure your pets in a comfortable room or take them for a walk during the service.

By taking these small steps, you allow the cleaning professionals to focus on what they do best: leaving your home sparkling clean!`,
    meta_title: 'Preparing for a Professional Clean | One Stop Cleaner',
    meta_description: 'Learn how to prepare your home for a professional deep cleaning service to maximize efficiency and get the best results.'
  }
];

const insert = db.prepare(`
  INSERT INTO blog_posts (title, slug, status, category, author, cover_url, excerpt, body, meta_title, meta_description, created_at, published_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
`);

let count = 0;
for (const b of blogs) {
  try {
    insert.run(b.title, b.slug, b.status, b.category, b.author, b.cover_url, b.excerpt, b.body, b.meta_title, b.meta_description);
    count++;
  } catch (e) {
    if (!e.message.includes('UNIQUE')) {
      console.error('Error inserting:', b.slug, e.message);
    }
  }
}
console.log('Inserted ' + count + ' blog posts.');
db.close();
