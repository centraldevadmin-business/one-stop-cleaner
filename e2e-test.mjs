// End-to-end smoke test hitting the running servers (main :4000, admin :4001).
const BASE = 'http://127.0.0.1:4000';
const ADMIN = 'http://127.0.0.1:4001';

let pass = 0, fail = 0;
const failures = [];
function check(name, cond, detail) {
  if (cond) { pass++; }
  else { fail++; failures.push(name + (detail ? ` — ${detail}` : '')); }
}

async function jget(url, opts) {
  const r = await fetch(url, opts);
  const t = await r.text();
  let data; try { data = JSON.parse(t); } catch { data = t; }
  return { status: r.status, data };
}
async function jpost(url, body, opts = {}) {
  return jget(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) }, body: JSON.stringify(body) });
}

// 1. Public website static pages
for (const p of ['/', '/about.html', '/products.html', '/services.html', '/contact.html', '/blog.html', '/news.html', '/privacy.html', '/terms.html', '/clients.html', '/cleaners.html']) {
  const r = await fetch(BASE + p);
  check(`GET ${p}`, r.status === 200, `status ${r.status}`);
}

// 2. Public blog feed
let blog = await jget(BASE + '/api/blog/public');
check('public blog feed', blog.status === 200, JSON.stringify(blog.data).slice(0, 120));

// 3. Auth: login
const login = await jpost(BASE + '/api/auth/login', { email: 'admin@onestopcleaner.com', password: 'admin123' });
check('admin login', login.status === 200, JSON.stringify(login.data).slice(0, 120));
const token = login.data.token;
const authHeaders = { Authorization: 'Bearer ' + token };

// 4. Admin blog: create
const created = await jpost(ADMIN + '/api/blog', {
  title: 'E2E Test Post ' + Date.now(),
  slug: 'e2e-test-post-' + Date.now(),
  excerpt: 'excerpt', body: 'body content', category: 'News', author: 'Tester',
  status: 'draft', meta_title: 'Meta', meta_description: 'Desc',
}, { headers: authHeaders });
check('blog create', created.status === 201, JSON.stringify(created.data).slice(0, 160));
const postId = created.data?.id;

// 5. Admin blog: list
let list = await jget(ADMIN + '/api/blog', { headers: authHeaders });
check('blog list', list.status === 200 && Array.isArray(list.data), JSON.stringify(list.data).slice(0, 120));

// 6. Admin blog: get one
const one = await jget(ADMIN + `/api/blog/${postId}`, { headers: authHeaders });
check('blog get one', one.status === 200, JSON.stringify(one.data).slice(0, 120));

// 7. Admin blog: update
const upd = await fetch(ADMIN + `/api/blog/${postId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeaders }, body: JSON.stringify({ status: 'published', title: 'Updated ' + Date.now() }) });
check('blog update', upd.status === 200, upd.status + '');

// 8. Auth: /me
const me = await jget(BASE + '/api/auth/me', { headers: authHeaders });
check('auth /me', me.status === 200 && me.data.role === 'superadmin', JSON.stringify(me.data).slice(0, 120));

// 9. Leads
const lead = await jpost(ADMIN + '/api/leads', { source: 'contact', name: 'E2E Lead', email: 'e2e@x.com', message: 'hi', city: 'Sydney' }, { headers: authHeaders });
check('lead create', lead.status === 201, JSON.stringify(lead.data).slice(0, 120));

// 10. CMS blocks
const block = await jpost(ADMIN + '/api/cms/blocks', { key: 'e2e-' + Date.now(), title: 'E2E Block', body: 'body' }, { headers: authHeaders });
check('cms block create', block.status === 201, JSON.stringify(block.data).slice(0, 120));

// 11. Products
const prod = await jpost(ADMIN + '/api/cms/products', { name: 'E2E Product', category: 'consumable', price: 10, in_stock: 5 }, { headers: authHeaders });
check('product create', prod.status === 201, JSON.stringify(prod.data).slice(0, 120));

// 12. Contacts
const contact = await jpost(ADMIN + '/api/contacts', { type: 'general', name: 'E2E', email: 'c@x.com', message: 'hi' }, { headers: authHeaders });
check('contact create', contact.status === 201, JSON.stringify(contact.data).slice(0, 120));

// 13. Tickets
const ticket = await jpost(ADMIN + '/api/tickets', { subject: 'E2E ticket', category: 'general', priority: 'normal', requester_email: 't@x.com', message: 'help' }, { headers: authHeaders });
check('ticket create', ticket.status === 201, JSON.stringify(ticket.data).slice(0, 120));

// 14. Announcements
const ann = await jpost(ADMIN + '/api/announcements', { title: 'E2E', body: 'body', style: 'info' }, { headers: authHeaders });
check('announcement create', ann.status === 201, JSON.stringify(ann.data).slice(0, 120));

// 15. Legal
const legal = await fetch(ADMIN + '/api/legal/privacy', { method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeaders }, body: JSON.stringify({ body: 'Updated privacy terms E2E' }) });
check('legal update', legal.status === 200, legal.status + '');

// 16. Analytics dashboard
const dash = await jget(BASE + '/api/analytics/dashboard');
check('analytics dashboard', dash.status === 200, JSON.stringify(dash.data).slice(0, 120));

// 17. Public blog single post by slug
if (blog.data && blog.data.length) {
  const slug = blog.data[0].slug;
  const post = await jget(BASE + `/api/blog/public/${slug}`);
  check('public single post', post.status === 200, JSON.stringify(post.data).slice(0, 120));
}

// 18. Media upload (multipart)
try {
  const fd = new URLSearchParams();
  // Use a tiny text file since we can't easily attach binary here; test the route exists
  const up = await fetch(ADMIN + '/api/blog/upload', { method: 'POST', headers: { ...authHeaders } });
  check('media upload route', up.status === 400 || up.status === 201, 'status ' + up.status);
} catch (e) { check('media upload route', false, e.message); }

console.log(`\n=== E2E RESULTS: ${pass} passed, ${fail} failed ===`);
if (failures.length) {
  console.log('FAILURES:');
  for (const f of failures) console.log('  ✗ ' + f);
}
