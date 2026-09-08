// One Stop Cleaner — Blog (public)
// Renders published posts from the CMS. Supports a listing page and a
// single-post view via ?slug=... in the URL.
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

  function renderCard(post) {
    const article = document.createElement('article');
    article.className = 'card card--image reveal';
    article.style = 'padding:0; overflow:hidden; display:flex; flex-direction:column;';
    const cover = post.cover_url
      ? `<img class="card__image" src="${post.cover_url}" alt="${escapeHtml(post.title)}" style="width:100%; height:210px; object-fit:cover; display:block;">`
      : `<div class="card__image" style="width:100%; height:210px; background:var(--grad-soft); display:flex; align-items:center; justify-content:center; color:var(--brand); font-family:var(--font-display); font-size:2rem;">${escapeHtml((post.category || 'news').slice(0, 2))}</div>`;
    article.innerHTML =
      cover +
      `<div class="card__body">
        <span class="eyebrow" style="font-size:11px; gap:6px;"><span style="width:8px;height:8px;border-radius:50%;background:var(--brand);display:inline-block;"></span>${escapeHtml(post.category || 'News')}</span>
        <h3><a href="blog.html?slug=${encodeURIComponent(post.slug)}" style="color:inherit;">${escapeHtml(post.title)}</a></h3>
        <p>${escapeHtml(post.excerpt || '')}</p>
        <a class="link-arrow" href="blog.html?slug=${encodeURIComponent(post.slug)}">Read article <span aria-hidden="true">→</span></a>
      </div>`;
    return article;
  }

  function renderList(posts) {
    const grid = $('#blogGrid');
    const empty = $('#blogEmpty');
    if (!grid) return;
    grid.innerHTML = '';
    if (!posts || !posts.length) {
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';
    const ordered = [...posts].sort((a, b) => (a.position || 0) - (b.position || 0));
    ordered.forEach((p) => grid.appendChild(renderCard(p)));
    // Re-run reveal observer
    if (window.__initReveal) window.__initReveal();
  }

  function renderPost(post) {
    const wrap = $('#blog-post');
    if (!wrap) return;
    if (!post) {
      wrap.innerHTML = '<div class="container"><div class="section section--tight"><p class="section__lead" style="text-align:center;">Post not found.</p><div style="text-align:center;margin-top:24px;"><a class="btn btn--primary" href="blog.html">Back to blog</a></div></div></div>';
      return;
    }
    const cover = post.cover_url
      ? `<div style="width:100%; max-height:420px; overflow:hidden; border-radius:var(--radius-lg); margin-bottom:36px;"><img src="${post.cover_url}" alt="${escapeHtml(post.title)}" style="width:100%; height:100%; object-fit:cover;"></div>`
      : '';
    wrap.innerHTML =
      `<article class="section section--tight" style="padding-block:clamp(40px,7vw,72px);">
        <div class="container" style="max-width:760px;">
          <a href="blog.html" class="link-arrow" style="margin-bottom:24px; display:inline-flex;">← Back to blog</a>
          <span class="eyebrow" style="font-size:11px; gap:6px; margin-bottom:14px;"><span style="width:8px;height:8px;border-radius:50%;background:var(--brand);display:inline-block;"></span>${escapeHtml(post.category || 'News')}</span>
          <h1 class="hero__title" style="font-size:clamp(2rem,5vw,3.2rem); margin-bottom:16px;">${escapeHtml(post.title)}</h1>
          <p style="color:var(--muted); margin-bottom:12px;">By ${escapeHtml(post.author || 'One Stop Cleaner')} · ${formatDate(post.published_at)}</p>
          <p style="font-size:1.2rem; color:var(--slate); margin-bottom:32px; line-height:1.7;">${escapeHtml(post.excerpt || '')}</p>
          ${cover}
          <div class="post-body" style="font-size:1.08rem; color:var(--slate); line-height:1.8;">${post.body}</div>
          <div style="margin-top:48px; text-align:center;">
            <a class="btn btn--primary" href="services.html">Book a cleaner <span class="btn__arrow" aria-hidden="true">→</span></a>
          </div>
        </div>
      </article>`;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
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
