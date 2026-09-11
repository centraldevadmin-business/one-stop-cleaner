// One Stop Cleaner — News (public)
// Renders all published articles from the CMS as a blog-style grid, and shows
// the full article when one is clicked (via ?slug=... in the URL).
(function () {
  'use strict';

  const API = ''; // same origin
  const $ = (sel, root = document) => root.querySelector(sel);

  function api(path, opts = {}) {
    return fetch(API + path, opts).then(async (r) => {
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || 'Request failed');
      return data;
    });
  }

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function categoryPill(category) {
    const label = (category || 'News').toLowerCase();
    const cls = label === 'launch'
      ? 'bg-mint-50 text-mint-600'
      : label === 'platform'
        ? 'bg-sky-50 text-sky-600'
        : 'bg-slate-100 text-slate-600';
    return `<span class="px-3 py-1 rounded-full ${cls} text-xs font-semibold">${escapeHtml(category || 'News')}</span>`;
  }

  // Minimal markdown -> HTML for CMS article bodies.
  function markdownToHtml(md) {
    if (md == null) return '';
    let html = escapeHtml(md);
    // Headings
    html = html.replace(/^######\s+(.*)$/gm, '<h6 class="text-sm font-bold mt-8 mb-2">$1</h6>')
      .replace(/^####\s+(.*)$/gm, '<h4 class="text-lg font-bold mt-8 mb-2">$1</h4>')
      .replace(/^###\s+(.*)$/gm, '<h3 class="text-xl font-bold mt-8 mb-2">$1</h3>')
      .replace(/^##\s+(.*)$/gm, '<h2 class="text-2xl font-bold mt-8 mb-3">$1</h2>');
    // Bold / italic
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');
    // Ordered lists
    html = html.replace(/^\s*\d+\.\s+(.*)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, (m) => '<ol class="list-decimal pl-6 space-y-1">' + m.trim() + '</ol>');
    // Unordered lists
    html = html.replace(/^\s*[-*]\s+(.*)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, (m) => '<ul class="list-disc pl-6 space-y-1">' + m.trim() + '</ul>');
    // Paragraphs
    html = html.replace(/\n\n+/g, '</p><p>');
    html = '<p>' + html + '</p>';
    html = html.replace(/<p>\s*(<h[2346]|<ol|<ul)/g, '<p></p>$1')
      .replace(/(<\/h[2346]>|<\/ol>|<\/ul>)\s*<\/p>/g, '$1</p>');
    return html;
  }

  function renderCard(post) {
    const article = document.createElement('article');
    article.className = 'card group p-8 sm:p-10 bg-white border border-slate-100 shadow-soft hover:shadow-xl hover:-translate-y-1 transition-all duration-300';
    article.style = 'text-decoration:none; display:block;';
    const date = formatDate(post.published_at);
    article.innerHTML =
      `<div class="flex flex-wrap items-center gap-2 mb-4">
        ${categoryPill(post.category)}
        ${date ? `<span class="text-sm text-slate-500">${date}</span>` : `<span class="text-sm text-slate-500">${post.status === 'published' ? 'Published' : 'Pre-Launch'}</span>`}
      </div>
      <h2 class="font-display font-extrabold tracking-tight text-2xl sm:text-3xl text-navy-950 mb-4 group-hover:text-mint-600 transition-colors"><a href="news.html?slug=${encodeURIComponent(post.slug)}" style="color:inherit;text-decoration:none;">${escapeHtml(post.title)}</a></h2>
      <p class="text-slate-600 leading-relaxed text-lg mb-6">${escapeHtml(post.excerpt || '')}</p>
      <a class="link-arrow" href="news.html?slug=${encodeURIComponent(post.slug)}">Read article <span aria-hidden="true">→</span></a>`;
    return article;
  }

  let ALL_POSTS = [];

  function renderList(posts) {
    ALL_POSTS = posts || [];
    const grid = $('#newsGrid');
    const empty = $('#newsEmpty');
    if (!grid) return;
    grid.innerHTML = '';
    if (!posts || !posts.length) {
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.style.display = 'none';
    const ordered = [...posts].sort((a, b) => (a.position || 0) - (b.position || 0));
    ordered.forEach((p) => grid.appendChild(renderCard(p)));
    if (window.__initReveal) window.__initReveal();
  }

  function relatedPosts(currentSlug) {
    return ALL_POSTS
      .filter((p) => p.slug !== currentSlug)
      .slice(0, 3)
      .map((p) => ({ ...p, excerpt: (p.excerpt || '').slice(0, 120) }));
  }

  function renderPost(post) {
    const wrap = $('#news-post');
    if (!wrap) return;
    if (!post) {
      wrap.innerHTML =
        `<div class="max-w-3xl mx-auto px-5 sm:px-8 text-center py-16">
          <h1 class="font-display font-extrabold tracking-tight text-3xl text-navy-950 mb-4">Article not found</h1>
          <a class="btn btn--primary" href="news.html">Back to news</a>
        </div>`;
      return;
    }
    const date = formatDate(post.published_at);
    const cover = post.cover_url ? `<img src="${escapeHtml(post.cover_url)}" alt="" class="w-full h-64 sm:h-96 object-cover rounded-2xl" />` : '';
    const related = relatedPosts(post.slug);
    const relatedHtml = related.length
      ? `<div class="mt-24 pt-12 border-t border-slate-200">
          <h3 class="font-display font-extrabold tracking-tight text-2xl text-navy-950 mb-6">More from the blog</h3>
          <div class="grid gap-6 sm:grid-cols-3">
            ${related.map(renderCard).join('')}
          </div>
        </div>`
      : '';
    wrap.innerHTML =
      `<article class="py-10 sm:py-16">
        <a href="news.html" class="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-mint-600 transition-colors mb-10">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg> Back to news
        </a>
        <header class="max-w-3xl mx-auto">
          <div class="flex flex-wrap items-center gap-2 mb-5">${categoryPill(post.category)}${date ? `<span class="text-sm text-slate-500">${date}</span>` : ''}</div>
          <h1 class="font-display font-extrabold tracking-tight text-4xl sm:text-5xl lg:text-6xl text-navy-950 mb-6">${escapeHtml(post.title)}</h1>
          <p class="text-slate-600 text-lg sm:text-xl leading-relaxed mb-8">${escapeHtml(post.excerpt || '')}</p>
          <div class="flex items-center gap-3 pb-8 border-b border-slate-200">
            <span class="inline-grid place-items-center w-11 h-11 rounded-full bg-gradient-to-br from-mint-400 to-mint-600 text-white font-semibold">${escapeHtml((post.author || 'One Stop Cleaner').charAt(0).toUpperCase())}</span>
            <div>
              <p class="font-semibold text-navy-950">${escapeHtml(post.author || 'One Stop Cleaner')}</p>
              <p class="text-sm text-slate-500">One Stop Cleaner</p>
            </div>
          </div>
        </header>
        ${cover}
        <div class="max-w-3xl mx-auto">
          <div class="prose text-lg text-slate-700 leading-[1.9] pt-10 space-y-5">${markdownToHtml(post.body)}</div>
        </div>
        <div class="max-w-3xl mx-auto mt-14">
          <a class="btn btn--primary btn--lg" href="services.html">Book a cleaner <span class="btn__arrow" aria-hidden="true">→</span></a>
        </div>
        ${relatedHtml}
      </article>`;
  }

  function init() {
    const slug = new URLSearchParams(location.search).get('slug');
    if (slug) {
      api('/api/blog/public/' + encodeURIComponent(slug))
        .then(renderPost)
        .catch(() => renderPost(null));
    } else {
      api('/api/blog/public')
        .then(renderList)
        .catch(() => renderList([]));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
