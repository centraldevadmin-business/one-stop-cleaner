// One Stop Cleaner — Admin dashboard
(function () {
  'use strict';

  const API = ''; // same origin
  const tokenKey = 'osc_token';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const els = {
    loginView: $('#loginView'),
    dashView: $('#dashView'),
    loginForm: $('#loginForm'),
    loginMsg: $('#loginMsg'),
    sidebar: $('#sidebar'),
    toast: $('#toast'),
  };

  function api(path, opts = {}) {
    const headers = { ...(opts.headers || {}) };
    const token = localStorage.getItem(tokenKey);
    if (token) headers['Authorization'] = 'Bearer ' + token;
    if (opts.body) headers['Content-Type'] = 'application/json';
    return fetch(API + path, {
      ...opts,
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    }).then(async (r) => {
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || 'Request failed');
      return data;
    });
  }

  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => els.toast.classList.remove('show'), 2600);
  }

  function setView(view) {
    els.loginView.style.display = view === 'login' ? 'flex' : 'none';
    els.dashView.style.display = view === 'dash' ? 'flex' : 'none';

    if (view === 'dash') {
      const token = localStorage.getItem(tokenKey);
      if (token) {
        try {
          let base64Url = token.split('.')[1];
          let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          while (base64.length % 4) {
            base64 += '=';
          }
          const payload = JSON.parse(atob(base64));
          const isAdmin = payload.role === 'superadmin';
          const adminNavGroup = $('#adminOnlyNavGroup');
          const navUsers = $('#navUsers');
          if (adminNavGroup) adminNavGroup.style.display = isAdmin ? 'block' : 'none';
          if (navUsers) navUsers.style.display = isAdmin ? 'flex' : 'none';
        } catch (e) {}
      }
    }
  }

  // ---------- Auth ----------
  function login(email, password) {
    return api('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    });
  }

  function logout() {
    localStorage.removeItem(tokenKey);
    setView('login');
  }

  // ---------- Navigation ----------
  function goTo(panel) {
    $$('.admin__nav a').forEach((a) => a.classList.toggle('active', a.dataset.panel === panel));
    $$('.admin__panel').forEach((p) => p.classList.toggle('active', p.id === 'panel-' + panel));
    if (panel === 'dashboard') loadDashboard();
    if (panel === 'leads-clients') loadLeads('client', 'clientsTable');
    if (panel === 'leads-cleaners') loadLeads('cleaner', 'cleanersTable');
    if (panel === 'leads-businesses') loadLeads('business', 'businessesTable');
    if (panel === 'leads-investors') loadLeads('investor', 'investorsTable');
    if (panel === 'contacts') loadContacts();
    if (panel === 'tickets') loadTickets();
    if (panel === 'campaigns') { loadCampaigns(); loadCampaignStats(); }
    if (panel === 'blog') loadBlogPosts();
    if (panel === 'users') loadUsers();
    if (panel === 'media') loadMedia();
    if (panel === 'settings') loadSettings();
    if (els.sidebar) els.sidebar.classList.remove('open');
  }

  // ---------- Toasts / helpers ----------
  function badge(status) {
    const map = { new: 'badge--new', contacted: 'badge--contacted', qualified: 'badge--qualified', lost: 'badge--lost', running: 'badge--running', draft: 'badge--draft' };
    return `<span class="badge ${map[status] || ''}">${status}</span>`;
  }

  // ---------- Settings ----------
  async function loadSettings() {
    try {
      const data = await api('/api/settings');
      if (data) {
        if (data.maintenance_mode) {
          const cb = $('#setting-maintenance_mode');
          if (cb) cb.checked = (data.maintenance_mode === 'true');
        }
      }
    } catch (e) {
      toast(e.message);
    }
  }

  // ---------- Dashboard ----------
  async function loadDashboard() {
    const bento = $('#bentoDashboard');
    const funnelBody = $('#funnelTable tbody');
    const trafficBody = $('#trafficTable tbody');
    try {
      const d = await api('/api/analytics/dashboard');
      if (bento) {
        bento.innerHTML = `
          <!-- Top Row -->
          <div class="bento__cell top-card" style="display:flex; justify-content:space-between; padding:24px;">
            <div>
              <div style="font-size:12px; color:var(--slate); font-weight:600; margin-bottom:8px;">Total Leads</div>
              <div style="font-size:32px; font-weight:800; color:var(--ink); line-height:1;">${d.leads || 0}</div>
              <div style="font-size:11px; color:#22c55e; margin-top:8px; font-weight:600;">↗ ${d.newLeads || 0} new leads</div>
            </div>
            <div class="trend-bars">
              <div class="bar dim" style="height:30%"></div><div class="bar dim" style="height:60%"></div><div class="bar" style="height:40%"></div><div class="bar" style="height:100%"></div><div class="bar" style="height:80%"></div>
            </div>
          </div>
          <div class="bento__cell top-card" style="display:flex; justify-content:space-between; padding:24px;">
            <div>
              <div style="font-size:12px; color:var(--slate); font-weight:600; margin-bottom:8px;">Waitlist Signups</div>
              <div style="font-size:32px; font-weight:800; color:var(--ink); line-height:1;">${d.signups || 0}</div>
              <div style="font-size:11px; color:#22c55e; margin-top:8px; font-weight:600;">↗ tracked</div>
            </div>
            <div class="trend-bars">
              <div class="bar dim" style="height:50%"></div><div class="bar" style="height:80%"></div><div class="bar dim" style="height:40%"></div><div class="bar dim" style="height:60%"></div><div class="bar" style="height:100%"></div>
            </div>
          </div>
          <div class="bento__cell top-card" style="display:flex; justify-content:space-between; padding:24px;">
            <div>
              <div style="font-size:12px; color:var(--slate); font-weight:600; margin-bottom:8px;">Conversion Rate</div>
              <div style="font-size:32px; font-weight:800; color:var(--ink); line-height:1;">${d.conversionRate || 0}%</div>
              <div style="font-size:11px; color:#22c55e; margin-top:8px; font-weight:600;">↗ from visits</div>
            </div>
            <div class="trend-bars">
              <div class="bar dim" style="height:20%"></div><div class="bar dim" style="height:40%"></div><div class="bar" style="height:60%"></div><div class="bar" style="height:80%"></div><div class="bar" style="height:100%"></div>
            </div>
          </div>

          <!-- Middle Row -->
          <div class="bento__cell mid-square" style="padding:24px; text-align:center;">
            <div style="font-size:13px; color:var(--ink); font-weight:700; text-align:left; margin-bottom:12px;">Lead Conversion Level</div>
            <div style="font-size:42px; font-weight:800; color:var(--ink); line-height:1; margin-top:12px;">${d.leads ? Math.round((d.leads - d.newLeads) / d.leads * 100) : 0}%</div>
            <div class="gauge">
              <div class="gauge-val" style="display:none;"></div>
            </div>
            <div style="font-size:11px; color:var(--slate); font-weight:500;">Actioned Index</div>
          </div>
          <div class="bento__cell mid-square" style="padding:24px;">
            <div style="font-size:13px; color:var(--ink); font-weight:700; margin-bottom:4px;">Leads by Source</div>
            <div style="font-size:42px; font-weight:800; color:var(--ink); line-height:1; margin-bottom:12px;">${d.leads || 0}</div>
            <div class="stat-list">
              <div class="stat-list-item"><span style="color:var(--slate);"><span class="dot" style="background:#22c55e;"></span>Client Leads</span> <span>${(d.bySource || []).find(x => x.source === 'client')?.c || 0}</span></div>
              <div class="stat-list-item"><span style="color:var(--slate);"><span class="dot" style="background:var(--brand);"></span>Cleaner Leads</span> <span>${(d.bySource || []).find(x => x.source === 'cleaner')?.c || 0}</span></div>
              <div class="stat-list-item"><span style="color:var(--slate);"><span class="dot" style="background:#eab308;"></span>Investor Leads</span> <span>${(d.bySource || []).find(x => x.source === 'investor')?.c || 0}</span></div>
            </div>
            <button class="btn btn--outline" style="width:100%; margin-top:24px; font-size:12px;">View Details</button>
          </div>
          <div class="bento__cell mid-wide" style="padding:24px;">
            <div style="font-size:13px; color:var(--ink); font-weight:700; margin-bottom:8px;">Traffic Engagement</div>
            <p style="font-size:12px; color:var(--slate); line-height:1.5;">Overview of recent interactions across the platform.</p>
            <div style="margin-top:24px; background:var(--bg-soft); border-radius:8px; padding:16px; height:120px; display:flex; align-items:center; justify-content:center; color:var(--slate); font-weight:500;">
              [ Map / Activity Chart Visualization ]
            </div>
          </div>

          <!-- Bottom Row -->
          <div class="bento__cell bot-1 bento__cell--dark" style="padding:24px; display:flex; flex-direction:column; justify-content:center;">
            <div style="font-size:24px; font-weight:700; color:white; margin-bottom:8px; display:flex; align-items:center; gap:12px;">
               <div style="width:40px; height:40px; border-radius:50%; border:4px solid var(--brand); display:flex; align-items:center; justify-content:center; font-size:12px;">${d.leads ? Math.round(d.newLeads / d.leads * 100) : 0}</div>
               Pipeline Health Index
            </div>
            <p style="font-size:13px; opacity:0.8;">Impact of new lead generation on overall pipeline capacity</p>
          </div>
          <div class="bento__cell bot-2" style="padding:24px; display:flex; align-items:center; justify-content:center; gap:16px;">
             <div style="width:50px; height:50px; border-radius:50%; border:4px solid #22c55e; border-top-color:transparent; transform:rotate(45deg);"></div>
             <div>
               <div style="font-size:13px; font-weight:700; color:var(--ink);">Active Partners</div>
               <div style="font-size:11px; color:var(--slate); margin-top:2px;">Verified network</div>
             </div>
          </div>
          <div class="bento__cell bot-3 bento__cell--brand" style="padding:24px; background:var(--grad); color:white;">
            <div style="font-size:20px; font-weight:700; margin-bottom:8px;">Grow the community</div>
            <p style="font-size:13px; opacity:0.9;">Manage blog posts and articles</p>
            <div style="margin-top:16px; display:flex; gap:8px;">
               <div style="background:rgba(255,255,255,0.2); padding:4px 8px; border-radius:4px; font-size:11px; font-weight:600;">${d.posts || 0} Articles</div>
               <div style="background:rgba(255,255,255,0.2); padding:4px 8px; border-radius:4px; font-size:11px; font-weight:600;">Top content</div>
            </div>
          </div>
        `;
      }
      if (funnelBody) {
        funnelBody.innerHTML = (d.funnel || []).map((r) => `<tr><td><span style="text-transform:capitalize; font-weight:600;">${r.stage}</span></td><td>${r.count}</td></tr>`).join('') || '<tr><td colspan="2">No data.</td></tr>';
      }
      if (trafficBody) {
        trafficBody.innerHTML = (d.series || []).map((r) => `<tr><td>${r.day} (${r.date})</td><td>${r.events}</td></tr>`).join('') || '<tr><td colspan="2">No data.</td></tr>';
      }
    } catch (e) {
      if (bento) bento.innerHTML = `<p style="color:var(--slate)">Could not load dashboard: ${e.message}</p>`;
    }
  }

  // ---------- Leads ----------
  async function loadLeads(source, tableId) {
    const body = $(`#${tableId} tbody`);
    try {
      const d = await api(`/api/leads?source=${source}`);
      body.innerHTML = d.map((l) => `
        <tr>
          <td>${escapeHtml(l.name || l.company || '—')}</td>
          <td>${escapeHtml(l.email || '—')}</td>
          <td>${escapeHtml(source === 'client' ? l.service_type : (l.phone || l.company || '—'))}</td>
          <td>${badge(l.status)}</td>
          <td>${escapeHtml(l.stage || '—')}</td>
          <td>${escapeHtml(l.city || '—')}</td>
          <td>${escapeHtml(l.notes || '—')}</td>
          <td class="row-actions">
            <button class="icon-btn" onclick="editLead(${l.id})" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          </td>
        </tr>`).join('') || `<tr><td colspan="7">No ${source} leads yet.</td></tr>`;
    } catch (e) {
      body.innerHTML = `<tr><td colspan="7">Error: ${e.message}</td></tr>`;
    }
  }

  // ---------- Modal Logic ----------
  let currentModalSubmit = null;
  
  function openModal(title, html, onSubmit) {
    $('#editModalTitle').textContent = title;
    $('#editModalBody').innerHTML = html;
    $('#editModalOverlay').classList.add('open');
    currentModalSubmit = onSubmit;
  }
  
  function closeModal() {
    $('#editModalOverlay').classList.remove('open');
    currentModalSubmit = null;
  }
  
  // Handlers attached dynamically or after DOMContentLoaded. 
  // We'll attach them in init() to be safe, but can define them here.

  // ---------- Lead Editing ----------
  window.editLead = async function(id) {
    try {
      const lead = await api(`/api/leads/${id}`);
      const html = `
        <div class="form-grid">
          <div class="field"><label>Name / Company</label><input type="text" value="${escapeHtml(lead.name || lead.company || '')}" disabled /></div>
          <div class="field"><label>Email</label><input type="text" value="${escapeHtml(lead.email || '')}" disabled /></div>
          <div class="field"><label>Status</label>
            <select id="el-status">
              <option value="new" ${lead.status==='new'?'selected':''}>New</option>
              <option value="contacted" ${lead.status==='contacted'?'selected':''}>Contacted</option>
              <option value="qualified" ${lead.status==='qualified'?'selected':''}>Qualified</option>
              <option value="lost" ${lead.status==='lost'?'selected':''}>Lost</option>
            </select>
          </div>
          <div class="field"><label>Stage</label>
            <input type="text" id="el-stage" value="${escapeHtml(lead.stage || '')}" />
          </div>
          <div class="field full"><label>Notes</label>
            <textarea id="el-notes" rows="4">${escapeHtml(lead.notes||'')}</textarea>
          </div>
        </div>
      `;
      openModal('Edit Lead', html, async () => {
        try {
          await api(`/api/leads/${id}`, {
            method: 'PUT',
            body: {
              status: $('#el-status').value,
              stage: $('#el-stage').value,
              notes: $('#el-notes').value
            }
          });
          toast('Lead updated');
          closeModal();
          loadLeads(lead.source, `${lead.source}sTable`);
        } catch (e) { toast(e.message); }
      });
    } catch(e) { toast(e.message); }
  };

  // ---------- Contacts ----------
  async function loadContacts() {
    const body = $('#contactsTable tbody');
    try {
      const d = await api('/api/contacts');
      body.innerHTML = d.map((c) => `
        <tr>
          <td>${escapeHtml(c.name)}</td>
          <td>${escapeHtml(c.email)}</td>
          <td>${escapeHtml(c.type)}</td>
          <td>${badge(c.status)}</td>
          <td>${escapeHtml(c.city || '—')}</td>
          <td class="row-actions">
            <button class="icon-btn danger" onclick="deleteContact(${c.id})" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
          </td>
        </tr>`).join('') || '<tr><td colspan="6">No contacts yet.</td></tr>';
    } catch (e) { body.innerHTML = `<tr><td colspan="6">Error: ${e.message}</td></tr>`; }
  }
  window.deleteContact = async function(id) {
    if (!confirm('Delete this contact?')) return;
    try { await api(`/api/contacts/${id}`, { method: 'DELETE' }); toast('Contact deleted'); loadContacts(); } catch (e) { toast(e.message); }
  };

  // ---------- Tickets ----------
  async function loadTickets() {
    const body = $('#ticketsTable tbody');
    try {
      const d = await api('/api/tickets');
      body.innerHTML = d.map((t) => `
        <tr>
          <td>${escapeHtml(t.subject)}</td>
          <td>${escapeHtml(t.customer_email)}</td>
          <td>${badge(t.status)}</td>
          <td>${badge(t.priority)}</td>
          <td>${escapeHtml(new Date(t.created_at).toLocaleDateString())}</td>
          <td class="row-actions">
             <button class="icon-btn danger" onclick="deleteTicket(${t.id})" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
          </td>
        </tr>`).join('') || '<tr><td colspan="6">No tickets yet.</td></tr>';
    } catch (e) { body.innerHTML = `<tr><td colspan="6">Error: ${e.message}</td></tr>`; }
  }
  window.deleteTicket = async function(id) {
    if (!confirm('Delete this ticket?')) return;
    try { await api(`/api/tickets/${id}`, { method: 'DELETE' }); toast('Ticket deleted'); loadTickets(); } catch (e) { toast(e.message); }
  };

  // ---------- Blog ----------
  async function loadBlogPosts() {
    if ($('#blogFormPanel')) $('#blogFormPanel').style.display = 'none';
    if ($('#blogListPanel')) $('#blogListPanel').style.display = 'block';
    if ($('#btnNewBlog')) $('#btnNewBlog').style.display = 'inline-block';
    const body = $('#blogTable tbody');
    try {
      const d = await api('/api/blog');
      body.innerHTML = d.map((b) => `
        <tr>
          <td>${escapeHtml(b.title)}</td>
          <td>${escapeHtml(b.slug)}</td>
          <td>${escapeHtml(b.category || '—')}</td>
          <td>${badge(b.status)}</td>
          <td>${escapeHtml(new Date(b.created_at).toLocaleDateString())}</td>
          <td class="row-actions">
             <button class="icon-btn" onclick="previewBlogPost(${b.id})" title="Preview"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg></button>
             <button class="icon-btn" onclick="editBlogPost(${b.id})" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></button>
             <button class="icon-btn danger" onclick="deleteBlogPost(${b.id})" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
          </td>
        </tr>`).join('') || '<tr><td colspan="6">No posts yet.</td></tr>';
    } catch (e) { body.innerHTML = `<tr><td colspan="6">Error: ${e.message}</td></tr>`; }
  }
  window.deleteBlogPost = async function(id) {
    if (!confirm('Delete this post?')) return;
    try { await api(`/api/blog/${id}`, { method: 'DELETE' }); toast('Post deleted'); loadBlogPosts(); } catch (e) { toast(e.message); }
  };

  // Upload a cover photo for a new blog post.
  window.uploadBlogCover = async function(fileInput, urlInput) {
    if (!fileInput.files || !fileInput.files.length) return;
    const fd = new FormData();
    fd.append('image', fileInput.files[0]);
    try {
      toast('Uploading…');
      const res = await api('/api/blog/upload', { method: 'POST', body: fd });
      urlInput.value = res.url;
      toast('Image uploaded');
    } catch (e) { toast(e.message); }
  };

  // Preview a blog post in a modal.
  window.previewBlogPost = async function(id) {
    try {
      const post = await api(`/api/blog/${id}`);
      const body = $('#previewModalBody');
      const cover = post.cover_url
        ? `<img class="preview-cover" src="${escapeHtml(post.cover_url)}" alt="${escapeHtml(post.title)}">`
        : '';
      const bodyHtml = post.body
        ? post.body.split('\n').filter((l) => l.trim()).map((p) => `<p>${escapeHtml(p)}</p>`).join('')
        : '<p><em>No content yet.</em></p>';
      body.innerHTML = `
        <div class="preview-eyebrow">${escapeHtml(post.category || 'News')}</div>
        <h1 class="preview-title">${escapeHtml(post.title)}</h1>
        <div class="preview-meta">By ${escapeHtml(post.author || 'One Stop Cleaner')} · ${escapeHtml(new Date(post.published_at || post.created_at).toLocaleDateString())}</div>
        ${cover}
        ${post.excerpt ? `<p class="preview-excerpt">${escapeHtml(post.excerpt)}</p>` : ''}
        <div class="preview-content">${bodyHtml}</div>
      `;
      $('#previewModalOverlay').classList.add('open');
    } catch (e) { toast(e.message); }
  };

  // Edit a blog post in the modal.
  window.editBlogPost = async function(id) {
    try {
      const post = await api(`/api/blog/${id}`);
      const html = `
        <div class="form-grid">
          <div class="field full"><label>Title</label><input type="text" id="eb-title" value="${escapeHtml(post.title || '')}" /></div>
          <div class="field"><label>Slug</label><input type="text" id="eb-slug" value="${escapeHtml(post.slug || '')}" /></div>
          <div class="field"><label>Status</label><select id="eb-status"><option value="draft" ${post.status === 'draft' ? 'selected' : ''}>Draft</option><option value="published" ${post.status === 'published' ? 'selected' : ''}>Published</option></select></div>
          <div class="field"><label>Category</label><select id="eb-category"><option value="Launch" ${post.category === 'Launch' ? 'selected' : ''}>Launch</option><option value="Guide" ${post.category === 'Guide' ? 'selected' : ''}>Guide</option><option value="News" ${post.category === 'News' ? 'selected' : ''}>News</option></select></div>
          <div class="field"><label>Author</label><input type="text" id="eb-author" value="${escapeHtml(post.author || '')}" /></div>
          <div class="field"><label>Cover image URL</label><input type="text" id="eb-cover" value="${escapeHtml(post.cover_url || '')}" placeholder="https://…" /></div>
          <div class="field full"><label>Cover photo</label><div class="bl-upload-row"><input type="file" id="eb-cover-file" accept="image/*" style="font-size:13px;"/><button type="button" class="btn" id="eb-upload-btn">Upload photo</button></div></div>
          <div class="field full"><label>Excerpt</label><textarea id="eb-excerpt" rows="2">${escapeHtml(post.excerpt || '')}</textarea></div>
          <div class="field full"><label>Content</label><textarea id="eb-content" rows="6">${escapeHtml(post.body || '')}</textarea></div>
          <div class="field full"><label>SEO Title</label><input type="text" id="eb-meta-title" value="${escapeHtml(post.meta_title || '')}" /></div>
          <div class="field full"><label>SEO Description</label><textarea id="eb-meta-desc" rows="2">${escapeHtml(post.meta_description || '')}</textarea></div>
        </div>
      `;
      openModal('Edit Blog Post', html, async () => {
        try {
          await api(`/api/blog/${id}`, {
            method: 'PUT',
            body: {
              title: $('#eb-title').value,
              slug: $('#eb-slug').value,
              status: $('#eb-status').value,
              category: $('#eb-category').value,
              author: $('#eb-author').value,
              cover_url: $('#eb-cover').value,
              excerpt: $('#eb-excerpt').value,
              body: $('#eb-content').value,
              meta_title: $('#eb-meta-title').value,
              meta_description: $('#eb-meta-desc').value,
            },
          });
          toast('Post updated');
          closeModal();
          loadBlogPosts();
        } catch (e) { toast(e.message); }
      });
      // Wire the upload button inside the modal.
      $('#eb-upload-btn').addEventListener('click', () => {
        uploadBlogCover($('#eb-cover-file'), $('#eb-cover'));
      });
    } catch (e) { toast(e.message); }
  };

  // ---------- Campaigns ----------
  async function loadCampaigns() {
    const body = $('#campaignsTable tbody');
    try {
      const d = await api('/api/campaigns');
      body.innerHTML = d.map((c) => `
        <tr>
          <td>${escapeHtml(c.name)}</td>
          <td>${escapeHtml(c.channel)}</td>
          <td>${escapeHtml(c.audience || '—')}</td>
          <td>${badge(c.status)}</td>
          <td>${c.sent || 0}</td>
          <td>${c.opened || 0}</td>
          <td>${c.clicked || 0}</td>
          <td class="row-actions">
            ${c.status === 'draft' ? `<button class="icon-btn" data-send="${c.id}" title="Send"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>` : ''}
            <button class="icon-btn danger" data-del-campaign="${c.id}" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
          </td>
        </tr>`).join('') || '<tr><td colspan="8">No campaigns yet.</td></tr>';
      $$('[data-send]').forEach((b) => b.addEventListener('click', () => sendCampaign(b.dataset.send)));
      $$('[data-del-campaign]').forEach((b) => b.addEventListener('click', () => deleteCampaign(b.dataset.delCampaign)));
    } catch (e) {
      body.innerHTML = `<tr><td colspan="8">Error: ${e.message}</td></tr>`;
    }
  }

  async function loadCampaignStats() {
    try {
      const d = await api('/api/analytics/dashboard');
      const body = $('#campaignsTable tbody');
      // stats already reflected in dashboard
    } catch (e) {}
  }

  async function sendCampaign(id) {
    try {
      await api(`/api/campaigns/${id}/send`, { method: 'POST' });
      toast('Campaign sent!');
      loadCampaigns();
    } catch (e) { toast(e.message); }
  }

  async function deleteCampaign(id) {
    if (!confirm('Delete this campaign?')) return;
    try {
      await api(`/api/campaigns/${id}`, { method: 'DELETE' });
      toast('Campaign deleted');
      loadCampaigns();
    } catch (e) { toast(e.message); }
  }

  // ---------- Products ----------
  async function loadProducts() {
    const body = $('#productsTable tbody');
    try {
      const d = await api('/api/cms/products');
      body.innerHTML = d.map((p) => `
        <tr>
          <td>${escapeHtml(p.name)}</td>
          <td>${escapeHtml(p.category || '—')}</td>
          <td>$${Number(p.price).toFixed(2)}</td>
          <td>${p.in_stock}</td>
          <td class="row-actions">
            <button class="icon-btn danger" data-del-product="${p.id}" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
          </td>
        </tr>`).join('') || '<tr><td colspan="5">No products yet.</td></tr>';
      $$('[data-del-product]').forEach((b) => b.addEventListener('click', () => deleteProduct(b.dataset.delProduct)));
    } catch (e) {
      body.innerHTML = `<tr><td colspan="5">Error: ${e.message}</td></tr>`;
    }
  }

  async function deleteProduct(id) {
    if (!confirm('Delete this product?')) return;
    try {
      await api(`/api/cms/products/${id}`, { method: 'DELETE' });
      toast('Product deleted');
      loadProducts();
    } catch (e) { toast(e.message); }
  }

  // ---------- Users ----------
  async function loadUsers() {
    const body = $('#usersTable tbody');
    try {
      const d = await api('/api/auth');
      body.innerHTML = d.map((u) => `
        <tr>
          <td>${escapeHtml(u.name)}</td>
          <td>${escapeHtml(u.email)}</td>
          <td><span class="badge ${u.role === 'superadmin' ? 'badge--qualified' : 'badge--new'}">${u.role}</span></td>
          <td>${u.active ? 'Yes' : 'No'}</td>
          <td class="row-actions">
            <button class="icon-btn danger" data-del-user="${u.id}" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
          </td>
        </tr>`).join('') || '<tr><td colspan="5">No users yet.</td></tr>';
      $$('[data-del-user]').forEach((b) => b.addEventListener('click', () => deleteUser(b.dataset.delUser)));
    } catch (e) {
      body.innerHTML = `<tr><td colspan="5">Error: ${e.message}</td></tr>`;
    }
  }

  async function deleteUser(id) {
    if (!confirm('Delete this user?')) return;
    try {
      await api(`/api/auth/${id}`, { method: 'DELETE' });
      toast('User deleted');
      loadUsers();
    } catch (e) { toast(e.message); }
  }

  // ---------- Media ----------
  async function loadMedia() {
    const grid = $('#mediaGrid');
    try {
      const d = await api('/api/cms/media');
      grid.innerHTML = d.map((m) => `
        <figure class="media-card">
          ${m.type === 'video'
            ? `<div class="media-thumb media-thumb--video"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3" fill="currentColor" stroke="none"/></svg></div>`
            : `<img src="${escapeHtml(m.url)}" alt="${escapeHtml(m.title)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'media-thumb\\'>Image unavailable</div>'">`}
          <figcaption>
            <span class="badge ${m.type === 'video' ? 'badge--draft' : 'badge--new'}">${m.type}</span>
            <span>${escapeHtml(m.title)}</span>
            <button class="icon-btn danger" data-del-media="${m.id}" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
          </figcaption>
        </figure>`).join('') || '<p style="color:var(--slate)">No media yet.</p>';
      $$('[data-del-media]').forEach((b) => b.addEventListener('click', () => deleteMedia(b.dataset.delMedia)));
    } catch (e) {
      grid.innerHTML = `<p style="color:var(--slate)">Error: ${e.message}</p>`;
    }
  }

  async function deleteMedia(id) {
    if (!confirm('Delete this media?')) return;
    try {
      await api(`/api/cms/media/${id}`, { method: 'DELETE' });
      toast('Media deleted');
      loadMedia();
    } catch (e) { toast(e.message); }
  }

  // ---------- Forms ----------
  function handleForm(form, path, fields, successMsg, callback) {
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = {};
      for (const f of fields) {
        const el = form.querySelector(`#${f.id}`);
        if (!el) continue;
        if (f.type === 'number') body[f.key] = Number(el.value) || 0;
        else if (f.type === 'checkbox' || el.type === 'checkbox') body[f.key] = el.checked ? 'true' : 'false';
        else body[f.key] = el.value;
      }
      try {
        await api(path, { method: 'POST', body });
        toast(successMsg);
        form.reset();
        if (callback) callback();
      } catch (e) { toast(e.message); }
    });
  }

  // ---------- Utils ----------
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ---------- Init ----------
  function init() {
    // Auth
    els.loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = $('#login-email').value.trim();
      const password = $('#login-password').value;
      els.loginMsg.className = 'login-msg';
      els.loginMsg.textContent = 'Signing in…';
      try {
        const res = await login(email, password);
        localStorage.setItem(tokenKey, res.token);
        setView('dash');
        goTo('dashboard');
      } catch (e) {
        els.loginMsg.className = 'login-msg err';
        els.loginMsg.textContent = e.message;
      }
    });

    $('#logoutBtn').addEventListener('click', logout);
    $('#menuBtn').addEventListener('click', () => els.sidebar.classList.toggle('open'));
    $$('.admin__nav a').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); goTo(a.dataset.panel); }));

    // Forms
    handleForm($('#campaignForm'), '/api/campaigns', [
      { id: 'c-name', key: 'name' }, { id: 'c-channel', key: 'channel' },
      { id: 'c-audience', key: 'audience' }, { id: 'c-subject', key: 'subject' },
      { id: 'c-body', key: 'body' },
    ], 'Campaign created', loadCampaigns);

    handleForm($('#settingsForm'), '/api/settings', [
      { id: 'setting-maintenance_mode', key: 'maintenance_mode' }
    ], 'Settings saved successfully', loadSettings);

    handleForm($('#productForm'), '/api/cms/products', [
      { id: 'p-name', key: 'name' }, { id: 'p-category', key: 'category' },
      { id: 'p-price', key: 'price', type: 'number' }, { id: 'p-stock', key: 'in_stock', type: 'number' },
      { id: 'p-desc', key: 'description' },
    ], 'Product created', loadProducts);

    handleForm($('#userForm'), '/api/auth', [
      { id: 'u-name', key: 'name' }, { id: 'u-email', key: 'email' },
      { id: 'u-password', key: 'password' }, { id: 'u-role', key: 'role' },
    ], 'User created', loadUsers);

    handleForm($('#mediaForm'), '/api/cms/media', [
      { id: 'm-title', key: 'title' }, { id: 'm-type', key: 'type' },
      { id: 'm-url', key: 'url' },
    ], 'Media added', loadMedia);

    handleForm($('#ticketForm'), '/api/tickets', [
      { id: 't-email', key: 'customer_email' }, { id: 't-subject', key: 'subject' },
      { id: 't-priority', key: 'priority' }, { id: 't-body', key: 'body' },
    ], 'Ticket created', loadTickets);

    handleForm($('#blogForm'), '/api/blog', [
      { id: 'bl-title', key: 'title' }, { id: 'bl-slug', key: 'slug' },
      { id: 'bl-status', key: 'status' }, { id: 'bl-category', key: 'category' },
      { id: 'bl-author', key: 'author' }, { id: 'bl-cover', key: 'cover_url' },
      { id: 'bl-excerpt', key: 'excerpt' }, { id: 'bl-body', key: 'body' },
      { id: 'bl-meta-title', key: 'meta_title' }, { id: 'bl-meta-desc', key: 'meta_description' },
    ], 'Blog post created', loadBlogPosts);

    // Upload cover photo for a new blog post.
    $('#bl-upload-btn')?.addEventListener('click', () => {
      uploadBlogCover($('#bl-cover-file'), $('#bl-cover'));
    });

    // Blog Panel toggles and filters
    $('#btnNewBlog')?.addEventListener('click', () => {
      $('#blogFormPanel').style.display = 'block';
      $('#blogListPanel').style.display = 'none';
      $('#btnNewBlog').style.display = 'none';
    });
    $('#btnCancelBlog')?.addEventListener('click', () => {
      $('#blogFormPanel').style.display = 'none';
      $('#blogListPanel').style.display = 'block';
      $('#btnNewBlog').style.display = 'inline-block';
      $('#blogForm').reset();
    });
    $('#blogFilter')?.addEventListener('input', (e) => {
      const v = e.target.value.toLowerCase();
      $$('#blogTable tbody tr').forEach(tr => {
        tr.style.display = tr.innerText.toLowerCase().includes(v) ? '' : 'none';
      });
    });

    // Modal bindings
    $('#editModalClose')?.addEventListener('click', closeModal);
    $('#editModalCancel')?.addEventListener('click', closeModal);
    $('#editModalSave')?.addEventListener('click', () => {
      if (currentModalSubmit) currentModalSubmit();
    });
    $('#previewModalClose')?.addEventListener('click', () => {
      $('#previewModalOverlay').classList.remove('open');
    });

    // ---------- Admin theme toggle ----------
    const THEME_KEY = 'osc_admin_theme';
    const toggle = $('#adminThemeToggle');
    function applyAdminTheme(t) {
      document.documentElement.setAttribute('data-theme', t);
      if (toggle) toggle.textContent = t === 'dark' ? '☀️' : '🌙';
    }
    applyAdminTheme(localStorage.getItem(THEME_KEY) || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
    if (toggle) toggle.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      localStorage.setItem(THEME_KEY, next);
      applyAdminTheme(next);
    });

    // Route
    const token = localStorage.getItem(tokenKey);
    if (token) {
      setView('dash');
      const hash = window.location.hash.slice(1);
      goTo(hash || 'dashboard');
    } else {
      setView('login');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
