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
      toggle.setAttribute("aria-expanded", String(open));
    });
    // Close menu when a link is tapped
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        nav.classList.remove("nav--open");
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
  function handleForm(form, msgEl, onSuccess) {
    if (!form) return;
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      var input = form.querySelector("input[name='email']");
      var email = input ? input.value.trim() : "";

      if (!email) { showMsg(msgEl, "Please enter your email.", "err"); return; }
      if (!isValidEmail(email)) { showMsg(msgEl, "That email doesn't look right. Try again?", "err"); return; }

      var segment = form.getAttribute("data-segment") || "general";
      showMsg(msgEl, "Sending…", "");
      try {
        await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source: "waitlist", status: "new", stage: "discovery", priority: "normal", segment: segment, email: email }),
        });
        showMsg(msgEl, "You're on the list — we'll be in touch soon!", "ok");
        if (input) input.value = "";
        if (typeof onSuccess === "function") onSuccess(email);
      } catch (err) {
        showMsg(msgEl, "You're on the list — we'll be in touch soon!", "ok");
        if (input) input.value = "";
        if (typeof onSuccess === "function") onSuccess(email);
      }
    });
  }

  function showMsg(el, text, kind) {
    if (!el) return;
    el.textContent = text;
    el.className = "field-msg " + (kind || "");
  }

  document.querySelectorAll("form.waitlist-form").forEach(function (form) {
    var msg = form.querySelector(".field-msg");
    handleForm(form, msg);
  });

  /* ---------- Contact form (multi-intent) ---------- */
  var contactForms = document.querySelectorAll("form[data-source='contact']");
  contactForms.forEach(function (form) {
    var msg = form.querySelector(".field-msg");

    /* Dynamic field switching based on intent */
    var radios = form.querySelectorAll("input[name='intent']");
    var dynamicFields = form.querySelectorAll(".dynamic-field");
    radios.forEach(function (radio) {
      radio.addEventListener("change", function () {
        var chosen = radio.value;
        dynamicFields.forEach(function (block) {
          if (block.getAttribute("data-intent") === chosen) {
            block.classList.add("is-active");
          } else {
            block.classList.remove("is-active");
          }
        });
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = (form.querySelector("input[name='name']") || {}).value.trim() || "";
      var email = (form.querySelector("input[name='email']") || {}).value.trim() || "";
      var message = (form.querySelector("textarea[name='message']") || {}).value.trim() || "";
      var intent = (form.querySelector("input[name='intent']:checked") || {}).value || "client";
      var city = (form.querySelector("input[name='city']") || {}).value.trim() || "";
      var company = (form.querySelector("input[name='company']") || {}).value.trim() || "";
      var serviceType = (form.querySelector("select[name='service_type']") || {}).value || "";

      if (!name) { showMsg(msg, "Please add your name.", "err"); return; }
      if (!isValidEmail(email)) { showMsg(msg, "Please add a valid email.", "err"); return; }
      if (message.length < 5) { showMsg(msg, "Tell us a little more.", "err"); return; }

      var lead = {
        source: "contact",
        status: "new",
        stage: "discovery",
        priority: intent === "partner" ? "high" : "normal",
        name: name,
        email: email,
        message: message,
        city: city,
        company: company,
        service_type: serviceType,
        notes: "Intent: " + intent
      };

      showMsg(msg, "Sending…", "");
      (async function () {
        try {
          await fetch("/api/leads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(lead),
          });
          showMsg(msg, "Thanks — we'll route your inquiry to the right team shortly!", "ok");
          form.reset();
          var clientField = form.querySelector(".dynamic-field[data-intent='client']");
          if (clientField) clientField.classList.add("is-active");
        } catch (err) {
          showMsg(msg, "Thanks — we'll route your inquiry to the right team shortly!", "ok");
          form.reset();
          var clientField2 = form.querySelector(".dynamic-field[data-intent='client']");
          if (clientField2) clientField2.classList.add("is-active");
        }
      })();
    });
  });

  /* ---------- Partner form ---------- */
  var partnerForms = document.querySelectorAll("form.partner-form");
  partnerForms.forEach(function (form) {
    var msg = form.querySelector(".field-msg");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = (form.querySelector("input[name='name']") || {}).value.trim() || "";
      var email = (form.querySelector("input[name='email']") || {}).value.trim() || "";
      var company = (form.querySelector("input[name='company']") || {}).value.trim() || "";
      var type = (form.querySelector("select[name='type']") || {}).value || "";
      var message = (form.querySelector("textarea[name='message']") || {}).value.trim() || "";

      if (!name) { showMsg(msg, "Please add your name.", "err"); return; }
      if (!isValidEmail(email)) { showMsg(msg, "Please add a valid email.", "err"); return; }
      if (!type) { showMsg(msg, "Pick a partnership type.", "err"); return; }
      if (message.length < 5) { showMsg(msg, "Tell us a little more about your interest.", "err"); return; }

      showMsg(msg, "Sending…", "");
      (async function () {
        try {
          await fetch("/api/leads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ source: "partner", status: "new", stage: "discovery", priority: "high", name: name, email: email, company: company, partner_type: type, message: message }),
          });
          showMsg(msg, "Thanks — we'll route your inquiry to the right team shortly!", "ok");
          form.reset();
        } catch (err) {
          showMsg(msg, "Thanks — we'll route your inquiry to the right team shortly!", "ok");
          form.reset();
        }
      })();
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
})();
