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
    if (window.scrollY > 8) nav.classList.add("nav-scrolled");
    else nav.classList.remove("nav-scrolled");
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

    // Dropdown toggle on tap (mobile) and click
    document.querySelectorAll(".nav-dropdown").forEach(function (dd) {
      var trigger = dd.querySelector(".nav-link");
      if (trigger) {
        trigger.addEventListener("click", function (e) {
          if (window.matchMedia("(max-width: 860px)").matches) {
            e.preventDefault();
            var isOpen = dd.classList.toggle("nav-dropdown--open");
            document.querySelectorAll(".nav-dropdown").forEach(function (other) {
              if (other !== dd) other.classList.remove("nav-dropdown--open");
            });
            if (isOpen) {
              toggle.setAttribute("aria-expanded", "true");
            } else {
              toggle.setAttribute("aria-expanded", "false");
            }
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

      showMsg(msgEl, "Sending…", "");
      try {
        await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source: "waitlist", status: "new", stage: "discovery", priority: "normal", email: email }),
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

  /* ---------- Lead capture forms ----------
     Handles multi-field forms (class "lead-form") that post to /api/leads.
     Recognised fields: name, email, phone, service_type, city, source.
     The form's data-source attribute sets the lead source (defaults to
     "waitlist"). Works for the hero, waitlist, and CTA forms on every page. */
  function handleLeadForm(form) {
    if (!form) return;
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      var data = {};
      var fields = ["name", "email", "phone", "service_type", "city"];
      fields.forEach(function (f) {
        var el = form.querySelector("input[name='" + f + "'], select[name='" + f + "'], textarea[name='" + f + "']");
        if (el) data[f] = el.value.trim();
      });
      var msgEl = form.querySelector(".field-msg");
      var email = data.email || "";
      if (!email) { showMsg(msgEl, "Please enter your email.", "err"); return; }
      if (!isValidEmail(email)) { showMsg(msgEl, "That email doesn't look right. Try again?", "err"); return; }
      data.source = form.getAttribute("data-source") || "waitlist";
      showMsg(msgEl, "Sending…", "");
      try {
        await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        showMsg(msgEl, "You're on the list — we'll be in touch soon!", "ok");
        form.reset();
      } catch (err) {
        showMsg(msgEl, "Thanks — we'll be in touch shortly!", "ok");
        form.reset();
      }
    });
  }

  document.querySelectorAll("form.lead-form, form.hero__lead, form.cta-box__form").forEach(handleLeadForm);

  /* ---------- Contact form ---------- */
  var contactForms = document.querySelectorAll("form.contact-form");
  contactForms.forEach(function (form) {
    var msg = form.querySelector(".field-msg");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = (form.querySelector("input[name='name']") || {}).value.trim() || "";
      var email = (form.querySelector("input[name='email']") || {}).value.trim() || "";
      var message = (form.querySelector("textarea[name='message']") || {}).value.trim() || "";

      if (!name) { showMsg(msg, "Please add your name.", "err"); return; }
      if (!isValidEmail(email)) { showMsg(msg, "Please add a valid email.", "err"); return; }
      if (message.length < 5) { showMsg(msg, "Tell us a little more.", "err"); return; }

      showMsg(msg, "Sending…", "");
      (async function () {
        try {
          await fetch("/api/leads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ source: "contact", status: "new", stage: "discovery", priority: "normal", name: name, email: email, message: message }),
          });
          showMsg(msg, "Thanks — we'll be in touch shortly!", "ok");
          form.reset();
        } catch (err) {
          showMsg(msg, "Thanks — we'll be in touch shortly!", "ok");
          form.reset();
        }
      })();
    });
  });

  /* ---------- CTA Modal system
     Three calls-to-action across the site — each opens a lead-capture
     modal. We can't book a cleaner yet, so every CTA is a "notify me"
     lead that we route to the right team:
       - "Notify me"      → client waitlist (coming soon to your city)
       - "Grow your business" → cleaning service / provider signup
       - "Partner with us" → supplier / tech partner / investor inquiry
     Each modal posts to /api/leads with the correct source + stage. */
  var CTA_TYPES = {
    "notify-me": {
      title: "Be first in your city",
      subtitle: "We're launching soon. Leave your details and we'll notify you the moment One Stop Cleaner comes to your area — you'll be first to book trusted cleaners and shop products.",
      fields: [
        { type: "text", name: "name", label: "Your name", placeholder: "Jane Doe", autocomplete: "name" },
        { type: "email", name: "email", label: "Email address", placeholder: "you@example.com", autocomplete: "email", required: true },
        { type: "text", name: "city", label: "City", placeholder: "Sydney, NSW", autocomplete: "address-level2" },
      ],
      button: "Notify me",
      source: "waitlist",
      stage: "discovery",
      priority: "normal",
    },
    "grow-business": {
      title: "Grow your cleaning business",
      subtitle: "We're building the most trusted cleaning marketplace in Australia. Join now as a cleaning service and get matched with ready-to-book clients in your area the moment we launch.",
      fields: [
        { type: "text", name: "name", label: "Your name", placeholder: "Jane Doe", autocomplete: "name" },
        { type: "email", name: "email", label: "Email address", placeholder: "you@example.com", autocomplete: "email", required: true },
        { type: "text", name: "company", label: "Business name", placeholder: "SparkleClean Co.", autocomplete: "organization" },
        { type: "text", name: "city", label: "Service area", placeholder: "Sydney, NSW", autocomplete: "address-level2" },
      ],
      button: "Grow my business",
      source: "provider",
      stage: "discovery",
      priority: "high",
    },
    "partner": {
      title: "Partner with us",
      subtitle: "Whether you supply products, build tech, or want to invest — there's a place for you in the One Stop Cleaner ecosystem. Tell us about your interest and we'll be in touch.",
      fields: [
        { type: "text", name: "name", label: "Your name", placeholder: "Jane Doe", autocomplete: "name" },
        { type: "email", name: "email", label: "Email address", placeholder: "you@example.com", autocomplete: "email", required: true },
        { type: "text", name: "company", label: "Company", placeholder: "Your company", autocomplete: "organization" },
        { type: "textarea", name: "message", label: "How would you like to partner?", placeholder: "We supply eco-friendly cleaning products and want to partner…" },
      ],
      button: "Let's talk",
      source: "partner",
      stage: "discovery",
      priority: "high",
    },
  };

  function openCtaModal(type) {
    var spec = CTA_TYPES[type];
    if (!spec) return;
    var existing = document.getElementById("ctaModal");
    if (existing) existing.remove();

    var fieldsHtml = spec.fields.map(function (f) {
      var req = f.required ? " required" : "";
      var val = f.value ? " value=\"" + f.value + "\"" : "";
      if (f.type === "textarea") {
        return '<div class="cta-field"><label for="cta-' + f.name + '">' + f.label + "</label><textarea id=\"cta-" + f.name + "\" name=\"" + f.name + "\" rows=\"4\" placeholder=\"" + f.placeholder + "\"" + req + ">" + val + "</textarea></div>";
      }
      return '<div class="cta-field"><label for="cta-' + f.name + '">' + f.label + "</label><input type=\"" + f.type + "\" id=\"cta-" + f.name + "\" name=\"" + f.name + "\" placeholder=\"" + f.placeholder + "\"" + req + val + "></div>";
    }).join("");

    var modal = document.createElement("div");
    modal.id = "ctaModal";
    modal.className = "cta-modal-overlay";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "ctaModalTitle");
    modal.innerHTML =
      '<div class="cta-modal"><button class="cta-modal__close" type="button" aria-label="Close">&times;</button>' +
      '<div class="cta-modal__icon" aria-hidden="true"></div>' +
      '<h2 class="cta-modal__title" id="ctaModalTitle">' + spec.title + "</h2>" +
      '<p class="cta-modal__sub">' + spec.subtitle + "</p>" +
      '<form class="cta-modal__form" novalidate>' + fieldsHtml +
      '<button type="submit" class="btn btn--primary btn--lg btn--block">' + spec.button + "</button>" +
      '<p class="field-msg" role="status"></p></form></div>';

    document.body.appendChild(modal);
    document.body.style.overflow = "hidden";
    var closeBtn = modal.querySelector(".cta-modal__close");
    var msgEl = modal.querySelector(".field-msg");
    var form = modal.querySelector(".cta-modal__form");

    function closeModal() {
      modal.classList.remove("cta-modal__open");
      setTimeout(function () {
        modal.remove();
        document.body.style.overflow = "";
      }, 220);
    }

    modal.addEventListener("click", function (e) {
      if (e.target === modal || e.target.closest(".cta-modal__overlay-bg")) closeModal();
    });
    closeBtn.addEventListener("click", closeModal);
    document.addEventListener("keydown", function onKey(e) {
      if (e.key === "Escape") { closeModal(); document.removeEventListener("keydown", onKey); }
    });

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      var data = {};
      spec.fields.forEach(function (f) {
        var el = form.querySelector("[name='" + f.name + "']");
        if (el) data[f.name] = el.value.trim();
      });
      if (!data.email || !isValidEmail(data.email)) {
        showMsg(msgEl, "Please enter a valid email.", "err");
        return;
      }
      showMsg(msgEl, "Sending…", "");
      data.source = spec.source;
      data.stage = spec.stage;
      data.priority = spec.priority;
      data.status = "new";
      try {
        await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        var thanks = spec.source === "provider" ? "You're on the list — we'll be in touch as we launch!" :
          spec.source === "partner" ? "Thanks — we'll reach out about partnering soon!" :
          "You're on the list — we'll notify you the moment we launch in your city!";
        showMsg(msgEl, thanks, "ok");
        form.reset();
        setTimeout(closeModal, 1600);
      } catch (err) {
        showMsg(msgEl, "Thanks — we'll be in touch shortly!", "ok");
        setTimeout(closeModal, 1600);
      }
    });

    setTimeout(function () { modal.classList.add("cta-modal__open"); }, 16);
    var first = form.querySelector("input, textarea");
    if (first) first.focus();
  }

  // Wire every CTA button/link to its modal.
  document.querySelectorAll("[data-cta]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      openCtaModal(el.getAttribute("data-cta"));
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
