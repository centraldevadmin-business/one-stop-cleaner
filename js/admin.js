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
    els.loginView.style.display = view === 'login' ? 'grid' : 'none';
    els.dashView.style.display = view === 'dash' ? 'flex' : 'none';
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
    if (panel === 'leads') loadLeads();
    if (panel === 'campaigns') { loadCampaigns(); loadCampaignStats(); }
    if (panel === 'cms') { loadCms(); loadProducts(); }
    if (panel === 'products') { loadProducts(); }
    if (panel === 'users') loadUsers();
    if (panel === 'media') loadMedia();
    if (els.sidebar) els.sidebar.classList.remove('open');
  }

  // ---------- Toasts / helpers ----------
  function badge(status) {
    const map = { new: 'badge--new', contacted: 'badge--contacted', qualified: 'badge--qualified', lost: 'badge--lost', running: 'badge--running', draft: 'badge--draft' };
    return `<span class="badge ${map[status] || ''}">${status}</span>`;
  }

  // ---------- Dashboard ----------
  async function loadDashboard() {
    const grid = $('#statGrid');
    const stageBody = $('#stageTable tbody');
    try {
      const d = await api('/api/analytics/dashboard');
      const stats = [
        { label: 'Total leads', value: d.leads, sub: `${d.newLeads} new` },
        { label: 'Campaigns', value: d.campaigns, sub: `${d.running} running` },
        { label: 'Products', value: d.products, sub: 'active' },
        { label: 'Waitlist signups', value: d.signups, sub: 'tracked' },
        { label: 'Partner leads', value: d.partners, sub: 'interested' },
        { label: 'Emails sent', value: d.sent, sub: 'delivered' },
        { label: 'Opened', value: d.opened, sub: `${d.sent ? Math.round((d.opened / d.sent) * 100) : 0}% rate` },
        { label: 'Clicked', value: d.clicked, sub: `${d.sent ? Math.round((d.clicked / d.sent) * 100) : 0}% rate` },
      ];
      grid.innerHTML = stats.map((s) => `
        <div class="stat-card">
          <div class="stat-label">${s.label}</div>
          <div class="stat-value">${s.value}</div>
          <div class="stat-sub">${s.sub}</div>
        </div>`).join('');
      stageBody.innerHTML = (d.byStage || []).map((r) => `<tr><td>${r.stage}</td><td>${r.c}</td></tr>`).join('') || '<tr><td colspan="2">No data yet.</td></tr>';
    } catch (e) {
      grid.innerHTML = `<p style="color:var(--slate)">Could not load dashboard: ${e.message}</p>`;
    }
  }

  // ---------- Leads ----------
  async function loadLeads() {
    const body = $('#leadsTable tbody');
    try {
      const d = await api('/api/leads');
      body.innerHTML = d.map((l) => `
        <tr>
          <td>${escapeHtml(l.name || '—')}</td>
          <td>${escapeHtml(l.email || '—')}</td>
          <td>${escapeHtml(l.source || '—')}</td>
          <td>${badge(l.status)}</td>
          <td>${escapeHtml(l.stage || '—')}</td>
          <td>${escapeHtml(l.city || '—')}</td>
        </tr>`).join('') || '<tr><td colspan="6">No leads yet.</td></tr>';
    } catch (e) {
      body.innerHTML = `<tr><td colspan="6">Error: ${e.message}</td></tr>`;
    }
  }

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

  // ---------- CMS ----------
  async function loadCms() {
    const body = $('#cmsTable tbody');
    try {
      const d = await api('/api/cms/blocks');
      body.innerHTML = d.map((b) => `
        <tr>
          <td>${escapeHtml(b.key)}</td>
          <td>${escapeHtml(b.title || '—')}</td>
          <td>${b.position}</td>
          <td>${b.active ? 'Yes' : 'No'}</td>
          <td class="row-actions">
            <button class="icon-btn danger" data-del-cms="${b.id}" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
          </td>
        </tr>`).join('') || '<tr><td colspan="5">No blocks yet.</td></tr>';
      $$('[data-del-cms]').forEach((b) => b.addEventListener('click', () => deleteCms(b.dataset.delCms)));
    } catch (e) {
      body.innerHTML = `<tr><td colspan="5">Error: ${e.message}</td></tr>`;
    }
  }

  async function deleteCms(id) {
    if (!confirm('Delete this content block?')) return;
    try {
      await api(`/api/cms/blocks/${id}`, { method: 'DELETE' });
      toast('Content block deleted');
      loadCms();
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
  function handleForm(form, endpoint, fields, successMsg, reload) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = {};
      for (const f of fields) {
        const el = form.querySelector(`#${f.id}`);
        if (!el) continue;
        if (f.type === 'number') body[f.key] = Number(el.value) || 0;
        else body[f.key] = el.value;
      }
      try {
        await api(endpoint, { method: 'POST', body });
        toast(successMsg);
        form.reset();
        reload();
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

    handleForm($('#cmsForm'), '/api/cms/blocks', [
      { id: 'b-key', key: 'key' }, { id: 'b-title', key: 'title' },
      { id: 'b-position', key: 'position', type: 'number' }, { id: 'b-active', key: 'active', type: 'number' },
      { id: 'b-body', key: 'body' },
    ], 'Content block created', loadCms);

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
      goTo('dashboard');
    } else {
      setView('login');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
