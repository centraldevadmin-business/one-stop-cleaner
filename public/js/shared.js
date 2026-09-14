/* =========================================================================
   One Stop Cleaner — shared interactions
   Nav behavior, waitlist/contact forms, and scroll-reveal.
   ========================================================================= */
(function () {
  "use strict";

  /* ---------- Year ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Scroll-aware nav ---------- */
  var nav = document.getElementById("nav");
  var onScroll = function () {
    if (!nav) return;
    if (window.scrollY > 8) nav.classList.add("scrolled");
    else nav.classList.remove("scrolled");
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Mobile nav toggle ---------- */
  var toggle = document.getElementById("navToggle");
  var links = document.getElementById("navLinks");
  if (nav && toggle && links) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("nav--open");
      links.classList.toggle("hidden");
      toggle.setAttribute("aria-expanded", String(open));
    });
    // Close menu when a link is tapped
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        nav.classList.remove("nav--open");
        links.classList.add("hidden");
        toggle.setAttribute("aria-expanded", "false");
        document.querySelectorAll(".nav-dropdown").forEach(function (d) {
          d.classList.remove("nav-dropdown--open");
        });
      });
    });

    // Dropdown toggle on tap (mobile)
    document.querySelectorAll(".nav-dropdown").forEach(function (dd) {
      var trigger = dd.querySelector(".nav-link");
      if (trigger) {
        trigger.addEventListener("click", function (e) {
          // Services trigger is href="#" — never let it jump to the top.
          e.preventDefault();
          if (window.matchMedia("(max-width: 1024px)").matches) {
            var isOpen = dd.classList.toggle("nav-dropdown--open");
            document.querySelectorAll(".nav-dropdown").forEach(function (other) {
              if (other !== dd) other.classList.remove("nav-dropdown--open");
            });
            if (isOpen) toggle.setAttribute("aria-expanded", "true");
            else toggle.setAttribute("aria-expanded", "false");
          }
        });
      }
    });
    document.addEventListener("click", function (e) {
      if (!e.target.closest(".nav-dropdown")) {
        document.querySelectorAll(".nav-dropdown").forEach(function (d) {
          d.classList.remove("nav-dropdown--open");
        });
      }
    });
    // Close on Escape
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        nav.classList.remove("nav--open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------- Active link highlight ---------- */
  var thisPath = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll('nav a[href$=".html"]').forEach(function (a) {
    var href = a.getAttribute("href");
    if (href === thisPath || (thisPath === "" && href === "index.html")) {
      a.classList.add("nav-link--active");
    }
  });

  /* ---------- Email validation ---------- */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  function isValidEmail(v) { return EMAIL_RE.test((v || "").trim()); }

  /* ---------- Form handling ----------
     Wire to your backend / email service. For now it validates and gives
     friendly feedback so every page feels alive and professional. */
// handleForm logic removed, integrated into generic binder

  function showMsg(el, text, kind) {
    if (!el) return;
    el.textContent = text;
    el.className = "field-msg " + (kind || "");
  }

  document.querySelectorAll("form[data-source]").forEach(function (form) {
    var source = form.getAttribute("data-source");
    if (source === "contact") return;
    var msg = form.querySelector(".field-msg");
    if (!msg) return;
    
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      
      var input = form.querySelector("input[name='email']");
      var email = input ? input.value.trim() : "";
      if (!email) { showMsg(msg, "Please enter your email.", "err"); return; }
      if (!isValidEmail(email)) { showMsg(msg, "That email doesn't look right. Try again?", "err"); return; }
      
      // Grab extra fields if present
      var name = (form.querySelector("input[name='name']") || {}).value || null;
      var company = (form.querySelector("input[name='company']") || {}).value || null;
      var message = (form.querySelector("textarea[name='message']") || {}).value || null;
      var notes = form.getAttribute("data-notes") || null;
      var city = (form.querySelector("input[name='city']") || {}).value || null;

      showMsg(msg, "Sending…", "");
      try {
        await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            source: source, 
            status: "new", 
            stage: "discovery", 
            email: email,
            name: name,
            company: company,
            message: message,
            city: city,
            notes: notes
          }),
        });
        showMsg(msg, "Thanks! We've received your details.", "ok");
        form.reset();
      } catch (err) {
        showMsg(msg, "Something went wrong. Please try again.", "err");
      }
    });
  });

  /* ---------- Scroll reveal ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  function revealNow() {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }
  function revealInViewport() {
    revealEls.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) {
        el.classList.add("in");
      }
    });
  }
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    // Reveal elements already in view on load (above the fold), then observe
    // the rest. Some engines never fire the observer, so this guarantees
    // above-the-fold content is never stuck hidden.
    revealEls.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) {
        el.classList.add("in");
        io.unobserve(el);
      } else {
        io.observe(el);
      }
    });
    // Fallback: if the observer never fires (some headless engines), reveal
    // on scroll via a plain listener so nothing stays stuck hidden.
    var onScrollReveal = function () { revealInViewport(); };
    onScrollReveal();
    window.addEventListener("scroll", onScrollReveal, { passive: true });
  } else {
    revealNow();
  }

  /* ---------- Scroll progress bar ---------- */
  var bar = document.getElementById("scrollProgress");
  if (bar) {
    var onScrollProgress = function () {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var p = max > 0 ? (window.scrollY / max) : 0;
      bar.style.transform = "scaleX(" + p + ")";
    };
    onScrollProgress();
    window.addEventListener("scroll", onScrollProgress, { passive: true });
  }

  /* ---------- Cursor-follow glow on hero ---------- */
  var hero = document.querySelector(".hero__glow");
  if (hero && window.matchMedia("(pointer: fine)").matches) {
    var parent = hero.parentElement;
    parent.addEventListener("mousemove", function (e) {
      var r = parent.getBoundingClientRect();
      hero.style.setProperty("--mx", (e.clientX - r.left) + "px");
      hero.style.setProperty("--my", (e.clientY - r.top) + "px");
    });
  }

  /* Dark mode removed — site is light-only */

  /* ---------- Back to top ---------- */
  var btt = document.getElementById('backToTop');
  if (btt) {
    var onScrollBtt = function () {
      if (window.scrollY > 600) btt.classList.add('show');
      else btt.classList.remove('show');
    };
    onScrollBtt();
    window.addEventListener('scroll', onScrollBtt, { passive: true });
    btt.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------- FAQ accordion ---------- */
  var faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(function (item) {
    var q = item.querySelector('.faq-q');
    if (!q) return;
    q.addEventListener('click', function () {
      var open = item.classList.toggle('open');
      q.setAttribute('aria-expanded', String(open));
    });
  });

  /* ---------- Global CTA Button Handler ---------- */
  document.querySelectorAll('[data-cta="notify-me"]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      // Check if there is a lead capture form on the current page
      var form = document.querySelector('form.hero__lead') || document.querySelector('form[data-source="client"]') || document.querySelector('form[data-source="cleaner"]') || document.querySelector('form[data-source="investor"]');
      if (form) {
        // Smooth scroll to the form and focus the email input
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(function() {
          var input = form.querySelector('input[type="email"]');
          if (input) input.focus();
        }, 500);
      } else {
        // Redirect to index.html
        window.location.href = 'index.html';
      }
    });
  });

  /* ---------- Placeholder Links Handler ---------- */
  // Create a toast element
  var toast = document.createElement('div');
  toast.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 bg-navy-950 text-white px-6 py-3 rounded-full shadow-2xl z-[100] font-semibold text-sm transition-all duration-300 opacity-0 pointer-events-none translate-y-4 flex items-center gap-2 border border-navy-800';
  toast.innerHTML = '<span class="w-2 h-2 rounded-full bg-mint-500 animate-pulse"></span> Coming Soon: We are still getting things ready!';
  document.body.appendChild(toast);

  var toastTimeout;

  document.querySelectorAll('a[href="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      // Allow Services dropdown to work
      if (link.closest('.nav-dropdown')) return;
      
      e.preventDefault();
      
      // Show toast
      clearTimeout(toastTimeout);
      toast.classList.remove('opacity-0', 'translate-y-4');
      
      toastTimeout = setTimeout(function() {
        toast.classList.add('opacity-0', 'translate-y-4');
      }, 3000);
    });
  });

})();
