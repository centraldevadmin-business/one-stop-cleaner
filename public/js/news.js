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
    html = html.replace(/^######\s+(.*)$/gm, '<h6 class="text-base font-bold text-navy-950 mt-8 mb-4">$1</h6>')
      .replace(/^####\s+(.*)$/gm, '<h4 class="text-xl font-display font-bold text-navy-950 mt-10 mb-4">$1</h4>')
      .replace(/^###\s+(.*)$/gm, '<h3 class="text-2xl font-display font-extrabold text-navy-950 mt-12 mb-5">$1</h3>')
      .replace(/^##\s+(.*)$/gm, '<h2 class="text-3xl font-display font-extrabold text-navy-950 mt-14 mb-6">$1</h2>');
    // Bold / italic
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-navy-950">$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>');
    // Ordered lists
    html = html.replace(/^\s*\d+\.\s+(.*)$/gm, '<li class="mb-2 pl-2 marker:text-mint-600">$1</li>');
    html = html.replace(/(<li.*<\/li>\n?)+/g, (m) => '<ol class="list-decimal pl-6 my-6 space-y-2 text-slate-700 leading-relaxed">' + m.trim() + '</ol>');
    // Unordered lists
    html = html.replace(/^\s*[-*]\s+(.*)$/gm, '<li class="mb-2 pl-2 marker:text-mint-500">$1</li>');
    html = html.replace(/(<li.*<\/li>\n?)+/g, (m) => '<ul class="list-disc pl-6 my-6 space-y-2 text-slate-700 leading-relaxed">' + m.trim() + '</ul>');
    // Paragraphs
    html = html.replace(/\n\n+/g, '</p><p class="mb-6 leading-relaxed text-slate-700 text-lg">');
    html = '<p class="mb-6 leading-relaxed text-slate-700 text-lg">' + html + '</p>';
    html = html.replace(/<p[^>]*>\s*(<h[2346]|<ol|<ul)/g, '$1')
      .replace(/(<\/h[2346]>|<\/ol>|<\/ul>)\s*<\/p>/g, '$1');
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
    const hero = $('#news-hero');
    if (!wrap) return;
    
    // Hide the hero section for a single post view
    if (hero) hero.style.display = 'none';

    if (!post) {
      wrap.innerHTML =
        `<div class="max-w-3xl mx-auto px-5 sm:px-8 text-center py-16 mt-20">
          <h1 class="font-display font-extrabold tracking-tight text-3xl text-navy-950 mb-4">Article not found</h1>
          <a class="btn btn--primary" href="news.html">Back to news</a>
        </div>`;
      return;
    }
    const date = formatDate(post.published_at);
    const cover = post.cover_url ? `<img src="${escapeHtml(post.cover_url)}" alt="" class="w-full h-[400px] sm:h-[500px] object-cover rounded-3xl shadow-xl mt-8 mb-12" />` : '';
    const related = relatedPosts(post.slug);
    const relatedHtml = related.length
      ? `<div class="mt-24 pt-16 border-t border-slate-200">
          <h3 class="font-display font-extrabold tracking-tight text-3xl text-navy-950 mb-10">More from the blog</h3>
          <div class="grid gap-8 sm:grid-cols-3" id="related-articles-container">
          </div>
        </div>`
      : '';
    wrap.innerHTML =
      `<article class="py-16 sm:py-24 mt-20 px-5 sm:px-8">
        <div class="max-w-4xl mx-auto">
          <a href="news.html" class="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-mint-600 transition-colors mb-12">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg> Back to news
          </a>
          <header>
            <div class="flex flex-wrap items-center gap-3 mb-6">${categoryPill(post.category)}${date ? `<span class="text-sm font-semibold text-slate-500">${date}</span>` : ''}</div>
            <h1 class="font-display font-extrabold tracking-tight text-4xl sm:text-5xl lg:text-6xl text-navy-950 mb-8 leading-[1.1]">${escapeHtml(post.title)}</h1>
            <p class="text-slate-600 text-xl sm:text-2xl leading-relaxed mb-10">${escapeHtml(post.excerpt || '')}</p>
            <div class="flex items-center gap-4 pb-10 border-b border-slate-200">
              <span class="inline-grid place-items-center w-12 h-12 rounded-full bg-gradient-to-br from-mint-400 to-mint-600 text-white font-semibold text-lg">${escapeHtml((post.author || 'One Stop Cleaner').charAt(0).toUpperCase())}</span>
              <div>
                <p class="font-bold text-navy-950">${escapeHtml(post.author || 'One Stop Cleaner')}</p>
                <p class="text-sm font-medium text-slate-500">One Stop Cleaner</p>
              </div>
            </div>
          </header>
          ${cover}
          <div class="pt-6">${markdownToHtml(post.body)}</div>
        </div>
        ${relatedHtml}
      </article>`;

    if (related.length) {
      const container = wrap.querySelector('#related-articles-container');
      if (container) {
        related.forEach((p) => container.appendChild(renderCard(p)));
      }
    }
  }

  function init() {
    const slug = new URLSearchParams(location.search).get('slug');
    if (slug) {
      api('/api/blog/public/' + encodeURIComponent(slug))
        .then(renderPost)
        .catch(() => renderPost(null));
    } else {
      api('/api/blog/public')
        .then(posts => renderList((posts || []).filter(p => p.category?.toLowerCase() === 'news' || p.category?.toLowerCase() === 'launch')))
        .catch(() => renderList([]));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
