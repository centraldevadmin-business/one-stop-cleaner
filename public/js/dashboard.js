// One Stop Cleaner — Admin dashboard (hidden /dashboard)
// Full CRM, CMS, ticketing, contacts, RBAC, and audit UI.
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

  // Permission gate — hide panels the user's role cannot access.
  const ALL_PANELS = ['dashboard', 'analytics', 'leads', 'campaigns', 'cms', 'products', 'contacts', 'tickets', 'blog', 'users', 'roles', 'audit', 'media'];

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
    if (panel === 'analytics') loadAnalytics();
    if (panel === 'leads') loadLeads();
    if (panel === 'campaigns') { loadCampaigns(); }
    if (panel === 'cms') loadCms();
    if (panel === 'products') loadProducts();
    if (panel === 'contacts') loadContacts();
    if (panel === 'tickets') loadTickets();
    if (panel === 'blog') loadBlog();
    if (panel === 'users') loadUsers();
    if (panel === 'roles') loadRoles();
    if (panel === 'audit') loadAudit();
    if (panel === 'media') loadMedia();
    if (els.sidebar) els.sidebar.classList.remove('open');
  }

  // ---------- Toasts / helpers ----------
  function badge(status) {
    const map = {
      new: 'badge--new', contacted: 'badge--contacted', qualified: 'badge--qualified',
      lost: 'badge--lost', running: 'badge--running', draft: 'badge--draft',
      open: 'badge--new', in_progress: 'badge--contacted', resolved: 'badge--qualified', closed: 'badge--lost',
    };
    return `<span class="badge ${map[status] || ''}">${status || '—'}</span>`;
  }

  function priorityBadge(p) {
    const map = { low: 'badge--draft', normal: 'badge--contacted', high: 'badge--qualified', urgent: 'badge--lost' };
    return `<span class="badge ${map[p] || ''}">${p || 'normal'}</span>`;
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  // ---------- Dashboard ----------
  async function loadDashboard() {
    const grid = $('#statGrid');
    try {
      const d = await api('/api/analytics/dashboard');
      const iconStats = [
        { icon: 'leads', label: 'Total leads', value: d.leads, sub: `${d.newLeads} new` },
        { icon: 'contacts', label: 'Contacts', value: d.contacts || 0, sub: 'CRM entries' },
        { icon: 'tickets', label: 'Open tickets', value: d.openTickets || 0, sub: 'awaiting reply' },
        { icon: 'campaigns', label: 'Campaigns', value: d.campaigns, sub: `${d.running} running` },
        { icon: 'products', label: 'Products', value: d.products, sub: 'active' },
        { icon: 'posts', label: 'Blog posts', value: d.posts || 0, sub: 'all statuses' },
        { icon: 'sent', label: 'Emails sent', value: d.sent, sub: 'delivered' },
        { icon: 'opened', label: 'Opened', value: d.opened, sub: `${d.sent ? Math.round((d.opened / (d.sent || 1)) * 100) : 0}% rate` },
      ];
      grid.innerHTML = iconStats.map((s) => `
        <div class="stat-card--grad">
          <div class="stat-icon">${STAT_ICONS[s.icon]}</div>
          <div class="stat-value">${s.value}</div>
          <div class="stat-label">${s.label}</div>
          <div class="stat-sub">${s.sub}</div>
        </div>`).join('');

      renderSourceDonut(d.bySource || []);
      renderStatusDonut(d.byStatus || []);
      renderLineChart(d.series || []);
      renderSourceBars(d.bySource || []);
      renderActivity(d);
    } catch (e) {
      grid.innerHTML = `<p style="color:var(--slate)">Could not load dashboard: ${e.message}</p>`;
    }
  }

  // ---------- Stat icons (inline SVG) ----------
  const STAT_ICONS = {
    leads: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg>',
    contacts: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>',
    tickets: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
    campaigns: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
    products: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12"/></svg>',
    posts: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>',
    sent: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/></svg>',
    opened: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
  };

  // ---------- Donut chart ----------
  const DONUT_COLORS = ['#0f172a', '#1e3a8a', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];

  function arcPath(cx, cy, r, startAngle, endAngle) {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return ['M', cx, cy, 'L', start.x, start.y, 'A', r, r, 0, largeArcFlag, 0, end.x, end.y, 'Z'].join(' ');
  }
  function polarToCartesian(cx, cy, r, angleDeg) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function renderDonut(containerId, valueId, detailsId, data) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const total = data.reduce((a, b) => a + (b.c || b.count || 0), 0) || 0;
    const cx = 60, cy = 60, r = 46, stroke = 26;
    const svg = container.querySelector('svg');
    svg.innerHTML = '';
    let offset = 0;
    const circ = 2 * Math.PI * r;
    data.forEach((item, i) => {
      const val = item.c || item.count || 0;
      if (val <= 0) return;
      const frac = val / total;
      const dash = frac * circ;
      const gap = circ - dash;
      const seg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      seg.setAttribute('cx', cx); seg.setAttribute('cy', cy); seg.setAttribute('r', r);
      seg.setAttribute('fill', 'none');
      seg.setAttribute('stroke', DONUT_COLORS[i % DONUT_COLORS.length]);
      seg.setAttribute('stroke-width', stroke);
      seg.setAttribute('stroke-dasharray', `${dash} ${gap}`);
      seg.setAttribute('stroke-dashoffset', -offset);
      seg.setAttribute('transform', `rotate(-90 ${cx} ${cy})`);
      svg.appendChild(seg);
      offset += dash;
    });
    document.getElementById(valueId).textContent = total;
    const details = document.getElementById(detailsId);
    details.innerHTML = data.map((item, i) => {
      const val = item.c || item.count || 0;
      const pct = total ? Math.round((val / total) * 100) : 0;
      const name = item.stage || item.status || item.source || item.label || item.name || `#${i + 1}`;
      return `<div class="donut-detail"><span class="dd-name"><span class="dd-dot" style="background:${DONUT_COLORS[i % DONUT_COLORS.length]}"></span>${escapeHtml(name)}</span><span class="dd-val">${val} <em style="color:var(--muted);font-weight:500">(${pct}%)</em></span></div>`;
    }).join('');
  }

  function renderSourceDonut(data) { renderDonut('sourceDonut', 'sourceDonutValue', 'sourceDonutDetails', data); }
  function renderStatusDonut(data) { renderDonut('statusDonut', 'statusDonutValue', 'statusDonutDetails', data); }

  // ---------- Line / area chart ----------
  function renderLineChart(series) {
    const chart = document.getElementById('dashLineChart');
    if (!chart) return;
    if (!series.length) { chart.innerHTML = '<div class="empty-soft">No traffic data yet.</div>'; return; }
    const W = chart.clientWidth || 700, H = 220, pad = 40;
    const max = Math.max(...series.map((s) => s.events), 1);
    const n = series.length;
    const x = (i) => pad + (i / Math.max(1, n - 1)) * (W - pad * 2);
    const y = (v) => H - pad - (v / max) * (H - pad * 2);
    let gridLines = '';
    for (let g = 0; g <= 4; g++) {
      const gy = pad + (g / 4) * (H - pad * 2);
      const gv = Math.round(max - (g / 4) * max);
      gridLines += `<line class="grid-line" x1="0" y1="${gy}" x2="${W}" y2="${gy}"/><text x="6" y="${gy - 4}" class="dot-label">${gv}</text>`;
    }
    const pathPts = series.map((s, i) => `${x(i)},${y(s.events)}`);
    const pathD = pathPts.map((p, i) => (i === 0 ? 'M' : 'L') + p).join(' ');
    const areaD = pathD + ` L${x(n - 1)},${H - pad} L${x(0)},${H - pad} Z`;
    let dots = '';
    series.forEach((s, i) => {
      dots += `<circle class="dot" cx="${x(i)}" cy="${y(s.events)}" r="3.5"/><text class="dot-val" x="${x(i)}" y="${y(s.events) - 10}">${s.events}</text><text class="dot-label" x="${x(i)}" y="${H - 12}">${s.day}</text>`;
    });
    chart.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}">
        <defs><linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#2563eb" stop-opacity="0.5"/>
          <stop offset="100%" stop-color="#2563eb" stop-opacity="0.02"/>
        </linearGradient></defs>
        ${gridLines}
        <path class="line-area" d="${areaD}"/>
        <path class="line-path" d="${pathD}"/>
        ${dots}
      </svg>`;
  }

  // ---------- Horizontal bars ----------
  function renderSourceBars(data) {
    const el = document.getElementById('sourceBars');
    if (!el) return;
    if (!data.length) { el.innerHTML = '<div class="empty-soft">No data yet.</div>'; return; }
    const max = Math.max(...data.map((d) => d.c || d.count || 0), 1);
    el.innerHTML = data.map((item, i) => {
      const val = item.c || item.count || 0;
      const pct = Math.round((val / max) * 100);
      const name = item.source || item.stage || item.status || item.label || `#${i + 1}`;
      return `<div class="hbar-row"><div class="hbar-top"><span class="hbar-name">${escapeHtml(name)}</span><span class="hbar-val">${val}</span></div><div class="hbar-track"><div class="hbar-fill ${i % 2 ? 'alt' : ''}" style="width:${pct}%"></div></div></div>`;
    }).join('');
  }

  // ---------- Recent activity ----------
  function renderActivity(d) {
    const el = document.getElementById('recentActivity');
    if (!el) return;
    const items = [
      { icon: 'leads', text: `<strong>${d.newLeads || 0}</strong> new leads this week`, time: 'This week' },
      { icon: 'tickets', text: `<strong>${d.openTickets || 0}</strong> tickets awaiting reply`, time: 'Active' },
      { icon: 'campaigns', text: `<strong>${d.running || 0}</strong> campaigns currently running`, time: 'Active' },
      { icon: 'opened', text: `<strong>${d.sent ? Math.round((d.opened / (d.sent || 1)) * 100) : 0}%</strong> email open rate`, time: 'Last campaign' },
      { icon: 'contacts', text: `<strong>${d.contacts || 0}</strong> contacts in CRM`, time: 'Total' },
    ];
    el.innerHTML = items.map((it) => `
      <div class="activity-item">
        <div class="activity-icon">${STAT_ICONS[it.icon]}</div>
        <div class="activity-body"><div class="activity-text">${it.text}</div><div class="activity-time">${it.time}</div></div>
      </div>`).join('');
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  // ---------- Analytics ----------
  async function loadAnalytics() {
    const range = $('#analytics-range') ? Number($('#analytics-range').value) : 30;
    try {
      const [dash, insights] = await Promise.all([
        api('/api/analytics/dashboard'),
        api('/api/analytics/insights'),
      ]);

      renderKpis(dash, insights);
      renderInsights(insights);
      renderTrafficChart(dash.series || []);
      renderTopPages(dash.topPages || []);
      renderFunnel(dash.funnel || []);
      renderCampaignMetrics(dash);
      renderSupportMetrics(dash);
    } catch (e) {
      $('#kpis').innerHTML = `<p style="color:var(--slate)">Could not load analytics: ${e.message}</p>`;
    }
  }

  function deltaHtml(growth) {
    if (growth == null || isNaN(growth)) return `<span class="kpi-delta neutral">—</span>`;
    const cls = growth > 0 ? 'up' : growth < 0 ? 'down' : 'neutral';
    const arrow = growth > 0 ? '▲' : growth < 0 ? '▼' : '▪';
    return `<span class="kpi-delta ${cls}">${arrow} ${Math.abs(growth)}%</span>`;
  }

  function renderKpis(d, insights) {
    const visits = d.visits || 0;
    const signups = d.signups || 0;
    const kpis = [
      { label: 'Total visits', value: visits, delta: insights.growth, sub: 'tracked page views' },
      { label: 'Waitlist signups', value: signups, delta: insights.growth, sub: `${d.partners || 0} via partners` },
      { label: 'Conversion rate', value: `${d.conversionRate || 0}%`, sub: 'signup / visit' },
      { label: 'Total leads', value: d.leads, sub: `${d.newLeads} new` },
      { label: 'Contacts', value: d.contacts || 0, sub: 'CRM entries' },
      { label: 'Open tickets', value: d.openTickets || 0, sub: 'awaiting reply' },
    ];
    $('#kpis').innerHTML = kpis.map((k) => `
      <div class="kpi-card">
        <div class="kpi-label">${k.label}</div>
        <div class="kpi-value">${k.value}</div>
        ${k.delta != null ? deltaHtml(k.delta) : ''}
        <div class="kpi-sub">${k.sub}</div>
      </div>`).join('');
  }

  function renderInsights(i) {
    $('#insights').innerHTML = [
      { label: 'Most active event', value: i.topEvent, sub: `${i.topEventCount} events` },
      { label: 'Peak hour', value: i.peakHour, sub: 'daily traffic' },
      { label: 'Weekly events', value: i.weekEvents, sub: deltaHtml(i.growth) },
      { label: 'Engagement trend', value: i.growth != null ? `${i.growth > 0 ? '+' : ''}${i.growth}%` : '—', sub: 'vs prior week' },
    ].map((t) => `
      <div class="insight-tile">
        <div class="it-label">${t.label}</div>
        <div class="it-value">${t.value}</div>
        <div class="kpi-sub">${t.sub}</div>
      </div>`).join('') || '<div class="empty-soft">No events tracked yet.</div>';
  }

  function renderTrafficChart(series) {
    const chart = $('#trafficChart');
    if (!series.length) { chart.innerHTML = '<div class="empty-soft">No traffic data yet.</div>'; return; }
    const max = Math.max(...series.map((s) => s.events), 1);
    chart.innerHTML = series.map((s) => {
      const h = Math.max(6, (s.events / max) * 100);
      return `
        <div class="bar-col">
          <div class="bar-track"><div class="bar" style="height:${h}%"><span class="bar-val">${s.events}</span></div></div>
          <div class="bar-label">${s.day}</div>
        </div>`;
    }).join('');
  }

  function renderTopPages(pages) {
    const el = $('#topPages');
    if (!pages.length) { el.innerHTML = '<div class="empty-soft">No page data yet.</div>'; return; }
    const max = Math.max(...pages.map((p) => p.c), 1);
    el.innerHTML = pages.map((p) => `
      <div class="dl-row">
        <div class="dl-name">${escapeHtml(p.page)}</div>
        <div class="dl-bar"><span style="width:${Math.round((p.c / max) * 100)}%"></span></div>
        <div class="dl-val">${p.c}</div>
      </div>`).join('');
  }

  function renderFunnel(funnel) {
    const el = $('#funnel');
    const active = funnel.filter((f) => f.stage !== 'lost');
    const total = active.reduce((a, f) => a + f.count, 0) || 1;
    el.innerHTML = funnel.map((f) => {
      const pct = Math.round((f.count / total) * 100);
      const isLost = f.stage === 'lost';
      return `
        <div class="funnel-row">
          <div class="funnel-name">${f.stage}</div>
          <div class="funnel-track"><div class="funnel-fill" style="width:${Math.max(pct, 8)}%; background: ${isLost ? '#d94f4f' : 'var(--grad)'}">${f.count}</div></div>
          <div class="funnel-pct">${pct}%</div>
        </div>`;
    }).join('') || '<div class="empty-soft">No lead data yet.</div>';
  }

  function renderCampaignMetrics(d) {
    const el = $('#campaignMetrics');
    const sent = d.sent || 0;
    const opened = d.opened || 0;
    const clicked = d.clicked || 0;
    const rows = [
      { label: 'Emails sent', value: sent },
      { label: 'Opened', value: opened, sub: sent ? `${Math.round((opened / (sent || 1)) * 100)}% open rate` : '' },
      { label: 'Clicked', value: clicked, sub: sent ? `${Math.round((clicked / (sent || 1)) * 100)}% click rate` : '' },
    ];
    const max = Math.max(sent, opened, clicked, 1);
    el.innerHTML = rows.map((r) => `
      <div class="dl-row">
        <div class="dl-name">${r.label}</div>
        <div class="dl-bar"><span style="width:${Math.round((r.value / max) * 100)}%"></span></div>
        <div class="dl-val">${r.value}</div>
      </div>`).join('') || '<div class="empty-soft">No campaigns yet.</div>';
  }

  function renderSupportMetrics(d) {
    $('#supportMetrics').innerHTML = [
      { label: 'Open tickets', value: d.openTickets || 0, sub: 'needs attention' },
      { label: 'Resolved tickets', value: d.resolvedTickets || 0, sub: 'lifetime' },
      { label: 'Avg response', value: (d.ticketResponseHours || 0) > 0 ? `${d.ticketResponseHours}h` : '—', sub: 'to first reply' },
      { label: 'High-priority contacts', value: d.highPriorityContacts || 0, sub: 'not yet lost' },
    ].map((t) => `
      <div class="insight-tile">
        <div class="it-label">${t.label}</div>
        <div class="it-value">${t.value}</div>
        <div class="kpi-sub">${t.sub}</div>
      </div>`).join('');
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

  // ---------- Contacts CRM ----------
  async function loadContacts() {
    const body = $('#contactsTable tbody');
    try {
      const status = $('#contact-status').value;
      const d = await api('/api/contacts' + (status ? `?status=${status}` : ''));
      body.innerHTML = d.map((c) => `
        <tr>
          <td>${escapeHtml(c.name || '—')}</td>
          <td>${escapeHtml(c.email || '—')}</td>
          <td>${escapeHtml(c.type || '—')}</td>
          <td>${escapeHtml(c.interest || '—')}</td>
          <td>${priorityBadge(c.priority)}</td>
          <td>${badge(c.status)}</td>
          <td>${escapeHtml(c.company || '—')}</td>
          <td>${fmtDate(c.created_at)}</td>
        </tr>`).join('') || '<tr><td colspan="8">No contacts yet.</td></tr>';
    } catch (e) {
      body.innerHTML = `<tr><td colspan="8">Error: ${e.message}</td></tr>`;
    }
  }

  // ---------- Support Tickets ----------
  let currentTicketId = null;

  async function loadTickets() {
    const body = $('#ticketsTable tbody');
    try {
      const status = $('#ticket-status').value;
      const d = await api('/api/tickets' + (status ? `?status=${status}` : ''));
      body.innerHTML = d.map((t) => `
        <tr>
          <td><strong>${escapeHtml(t.ref)}</strong></td>
          <td>${escapeHtml(t.subject)}</td>
          <td>${escapeHtml(t.requester_name || '—')}</td>
          <td>${priorityBadge(t.priority)}</td>
          <td>${badge(t.status)}</td>
          <td>${fmtDate(t.created_at)}</td>
          <td class="row-actions">
            <button class="icon-btn" data-open-ticket="${t.id}" title="Open"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
            <button class="icon-btn danger" data-del-ticket="${t.id}" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
          </td>
        </tr>`).join('') || '<tr><td colspan="7">No tickets yet.</td></tr>';
      $$('[data-open-ticket]').forEach((b) => b.addEventListener('click', () => openTicket(b.dataset.openTicket)));
      $$('[data-del-ticket]').forEach((b) => b.addEventListener('click', () => deleteTicket(b.dataset.delTicket)));
    } catch (e) {
      body.innerHTML = `<tr><td colspan="7">Error: ${e.message}</td></tr>`;
    }
  }

  async function openTicket(id) {
    try {
      const t = await api(`/api/tickets/${id}`);
      currentTicketId = id;
      $('#tm-title').textContent = t.subject;
      $('#tm-meta').textContent = `${t.ref} · ${escapeHtml(t.requester_name || 'Unknown')} · ${escapeHtml(t.requester_email || '')} · opened ${fmtDate(t.created_at)}`;
      $('#tm-status').value = t.status;
      $('#tm-priority').value = t.priority;
      $('#tm-category').value = t.category;
      $('#tm-author').value = (window.__adminUser && window.__adminUser.name) || 'Support';
      const wrap = $('#tm-messages');
      wrap.innerHTML = (t.messages && t.messages.length)
        ? t.messages.map((m) => `
          <div class="ticket-msg ticket-msg--${m.author_role === 'customer' ? 'customer' : 'agent'}">
            <div class="msg-meta">${escapeHtml(m.author_name || 'Unknown')} · ${m.author_role} · ${fmtDate(m.created_at)}</div>
            <div>${escapeHtml(m.message)}</div>
          </div>`).join('')
        : '<div class="empty-state">No messages yet.</div>';
      $('#ticketModal').style.display = 'block';
      document.body.style.overflow = 'hidden';
    } catch (e) { toast(e.message); }
  }

  function closeTicket() {
    $('#ticketModal').style.display = 'none';
    document.body.style.overflow = '';
    currentTicketId = null;
  }

  async function deleteTicket(id) {
    if (!confirm('Delete this ticket?')) return;
    try {
      await api(`/api/tickets/${id}`, { method: 'DELETE' });
      toast('Ticket deleted');
      loadTickets();
    } catch (e) { toast(e.message); }
  }

  // ---------- Blog CMS ----------
  async function loadBlog() {
    const body = $('#blogTable tbody');
    try {
      const d = await api('/api/blog');
      body.innerHTML = d.map((p) => `
        <tr>
          <td>${escapeHtml(p.title)}</td>
          <td>${escapeHtml(p.category || '—')}</td>
          <td>${badge(p.status)}</td>
          <td>${escapeHtml(p.author || '—')}</td>
          <td>${fmtDate(p.published_at || p.created_at)}</td>
          <td class="row-actions">
            <button class="icon-btn danger" data-del-blog="${p.id}" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
          </td>
        </tr>`).join('') || '<tr><td colspan="6">No posts yet.</td></tr>';
      $$('[data-del-blog]').forEach((b) => b.addEventListener('click', () => deleteBlog(b.dataset.delBlog)));
    } catch (e) {
      body.innerHTML = `<tr><td colspan="6">Error: ${e.message}</td></tr>`;
    }
  }

  async function deleteBlog(id) {
    if (!confirm('Delete this post?')) return;
    try {
      await api(`/api/blog/${id}`, { method: 'DELETE' });
      toast('Post deleted');
      loadBlog();
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

  // ---------- RBAC: Roles ----------
  const PERMISSIONS = ['dashboard', 'leads', 'contacts', 'tickets', 'blog', 'cms', 'products', 'campaigns', 'users', 'roles', 'audit', 'media', 'analytics'];

  async function loadRoles() {
    try {
      const roles = await api('/api/roles');
      const body = $('#rolesTable tbody');
      body.innerHTML = roles.map((r) => `
        <tr>
          <td><strong>${escapeHtml(r.name)}</strong></td>
          <td>${escapeHtml(r.label || '—')}</td>
          <td>${r.assigned || 0}</td>
          <td>${(r.permissions || []).map(escapeHtml).join(', ') || '—'}</td>
          <td class="row-actions">
            <button class="icon-btn danger" data-del-role="${r.id}" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
          </td>
        </tr>`).join('') || '<tr><td colspan="5">No roles yet.</td></tr>';
      $$('[data-del-role]').forEach((b) => b.addEventListener('click', () => deleteRole(b.dataset.delRole)));

      // Render permission checkboxes
      const permGrid = $('#r-perms');
      permGrid.innerHTML = PERMISSIONS.map((p) => `<span class="perm-chip" data-perm="${p}">${p}</span>`).join('');
      $$('[data-perm]').forEach((chip) => chip.addEventListener('click', () => chip.classList.toggle('on')));

      // Populate selects for assignment
      const userSel = $('#a-user');
      const roleSel = $('#a-role');
      const users = await api('/api/auth');
      userSel.innerHTML = users.map((u) => `<option value="${u.id}">${escapeHtml(u.name)} (${escapeHtml(u.email)})</option>`).join('');
      roleSel.innerHTML = roles.map((r) => `<option value="${r.id}">${escapeHtml(r.label || r.name)}</option>`).join('');
    } catch (e) {
      $('#rolesTable tbody').innerHTML = `<tr><td colspan="5">Error: ${e.message}</td></tr>`;
    }
  }

  async function deleteRole(id) {
    if (!confirm('Delete this role?')) return;
    try {
      await api(`/api/roles/${id}`, { method: 'DELETE' });
      toast('Role deleted');
      loadRoles();
    } catch (e) { toast(e.message); }
  }

  // ---------- Audit Logs ----------
  async function loadAudit() {
    const body = $('#auditTable tbody');
    try {
      const q = $('#audit-q').value.trim();
      const d = await api('/api/audit' + (q ? `?q=${encodeURIComponent(q)}` : ''));
      body.innerHTML = d.map((a) => `
        <tr>
          <td>${fmtDate(a.created_at)}</td>
          <td>${escapeHtml(a.actor_name || '—')}</td>
          <td><span class="badge badge--draft">${escapeHtml(a.actor_role || '—')}</span></td>
          <td><code>${escapeHtml(a.action)}</code></td>
          <td>${escapeHtml(a.detail || '—')}</td>
        </tr>`).join('') || '<tr><td colspan="5">No activity yet.</td></tr>';
    } catch (e) {
      body.innerHTML = `<tr><td colspan="5">Error: ${e.message}</td></tr>`;
    }
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

  // ---------- Permissions: hide panels the user cannot access ----------
  async function applyPermissions() {
    try {
      const roles = await api('/api/roles/assignments/' + (window.__adminUser?.id || 0));
      let allowed = new Set(['dashboard']);
      if (window.__adminUser?.role === 'superadmin') {
        allowed = new Set(ALL_PANELS);
      } else {
        for (const a of roles) {
          for (const p of (a.permissions || [])) allowed.add(p);
        }
      }
      // Hide panels the user cannot access, and their nav links.
      $$('.admin__panel').forEach((p) => {
        const panel = p.id.replace('panel-', '');
        if (!allowed.has(panel)) p.style.display = 'none';
      });
      $$('.admin__nav a').forEach((a) => {
        const panel = a.dataset.panel;
        if (!allowed.has(panel)) a.style.display = 'none';
      });
    } catch (e) {
      // If permission check fails, fall back to showing everything.
    }
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
        window.__adminUser = res.user;
        setView('dash');
        goTo('dashboard');
        await applyPermissions();
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

    handleForm($('#blogForm'), '/api/blog', [
      { id: 'bl-title', key: 'title' }, { id: 'bl-author', key: 'author' },
      { id: 'bl-category', key: 'category' }, { id: 'bl-status', key: 'status' },
      { id: 'bl-cover', key: 'cover_url' }, { id: 'bl-excerpt', key: 'excerpt' },
      { id: 'bl-body', key: 'body' },
    ], 'Post created', loadBlog);

    handleForm($('#roleForm'), '/api/roles', [
      { id: 'r-name', key: 'name' }, { id: 'r-label', key: 'label' },
    ], 'Role created', loadRoles);
    $('#roleForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const permissions = [...$('[data-perm].on')].map((c) => c.dataset.perm);
      const body = {
        name: $('#r-name').value.trim(),
        label: $('#r-label').value.trim(),
        permissions,
      };
      try {
        await api('/api/roles', { method: 'POST', body });
        toast('Role created');
        $('#roleForm').reset();
        $$('[data-perm]').forEach((c) => c.classList.remove('on'));
        loadRoles();
      } catch (err) { toast(err.message); }
    });

    $('#assignForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = { user_id: Number($('#a-user').value), role_id: Number($('#a-role').value) };
      try {
        await api('/api/roles/assignments', { method: 'POST', body });
        toast('Role assigned');
        loadRoles();
      } catch (err) { toast(err.message); }
    });

    // Contacts filters
    $('#contact-refresh').addEventListener('click', loadContacts);
    $('#contact-status').addEventListener('change', loadContacts);

    // Ticket filters + modal
    $('#ticket-refresh').addEventListener('click', loadTickets);
    $('#ticket-status').addEventListener('change', loadTickets);
    $('#tm-close').addEventListener('click', closeTicket);
    $('[data-close-ticket]').addEventListener('click', closeTicket);
    $('#tm-message-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!currentTicketId) return;
      const body = {
        author_name: $('#tm-author').value.trim(),
        message: $('#tm-msg').value.trim(),
        author_role: 'agent',
      };
      try {
        await api(`/api/tickets/${currentTicketId}/messages`, { method: 'POST', body });
        $('#tm-msg').value = '';
        openTicket(currentTicketId);
      } catch (err) { toast(err.message); }
    });
    $('#tm-status').addEventListener('change', async (e) => {
      if (!currentTicketId) return;
      try { await api(`/api/tickets/${currentTicketId}`, { method: 'PUT', body: { status: e.target.value } }); loadTickets(); }
      catch (err) { toast(err.message); }
    });
    $('#tm-priority').addEventListener('change', async (e) => {
      if (!currentTicketId) return;
      try { await api(`/api/tickets/${currentTicketId}`, { method: 'PUT', body: { priority: e.target.value } }); loadTickets(); }
      catch (err) { toast(err.message); }
    });
    $('#tm-category').addEventListener('change', async (e) => {
      if (!currentTicketId) return;
      try { await api(`/api/tickets/${currentTicketId}`, { method: 'PUT', body: { category: e.target.value } }); loadTickets(); }
      catch (err) { toast(err.message); }
    });

    // Blog form
    handleForm($('#blogForm'), '/api/blog', [
      { id: 'bl-title', key: 'title' }, { id: 'bl-author', key: 'author' },
      { id: 'bl-category', key: 'category' }, { id: 'bl-status', key: 'status' },
      { id: 'bl-cover', key: 'cover_url' }, { id: 'bl-excerpt', key: 'excerpt' },
      { id: 'bl-body', key: 'body' },
    ], 'Post created', loadBlog);

    // Audit filter
    $('#audit-refresh').addEventListener('click', loadAudit);
    $('#audit-q').addEventListener('input', loadAudit);

    // Analytics
    $('#analytics-refresh').addEventListener('click', loadAnalytics);
    $('#analytics-range').addEventListener('change', loadAnalytics);

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
