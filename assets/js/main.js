/* =============================================================
   Mahakal Neuro Wellness Center — Dr. Umesh Shukla
   Interactions: nav, mobile menu, counters,
   lightbox, form + WhatsApp, reveal on scroll
   ============================================================= */
(function () {
  "use strict";

  var WHATSAPP_NUMBER = "919993032780";
  var WA_LINK = "https://wa.me/" + WHATSAPP_NUMBER;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* reveal styles only apply when JS is running */
  document.documentElement.classList.add("js-reveal");

  /* Hero entrance: wait one painted frame so the hidden state is committed,
     then let the staggered load-in transition run. */
  function markLoaded() { document.body.classList.add("is-loaded"); }
  requestAnimationFrame(function () { requestAnimationFrame(markLoaded); });
  /* safety net: never leave hero content hidden if something stalls */
  window.setTimeout(markLoaded, 1600);

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ---------------- Sticky nav ---------------- */
  var nav = $(".site-nav");
  var fabTop = $(".fab-top");

  function onScroll() {
    var y = window.pageYOffset || document.documentElement.scrollTop;
    if (nav) nav.classList.toggle("is-scrolled", y > 40);
    if (fabTop) fabTop.classList.toggle("is-visible", y > 600);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------------- Mobile menu ---------------- */
  var toggle = $(".nav-toggle");
  var mobileMenu = $(".mobile-menu");
  var backdrop = $(".nav-backdrop");

  function setMenu(open) {
    if (!mobileMenu) return;
    mobileMenu.classList.toggle("is-open", open);
    if (backdrop) backdrop.classList.toggle("is-open", open);
    if (toggle) toggle.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.style.overflow = open ? "hidden" : "";
  }

  if (toggle) {
    toggle.addEventListener("click", function () {
      setMenu(toggle.getAttribute("aria-expanded") !== "true");
    });
  }
  if (backdrop) backdrop.addEventListener("click", function () { setMenu(false); });
  $$(".mobile-menu a").forEach(function (a) {
    a.addEventListener("click", function () { setMenu(false); });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      setMenu(false);
      closeLightbox();
    }
  });

  /* ---------------- Active nav link ---------------- */
  (function activeLink() {
    var path = window.location.pathname.split("/").pop() || "index.html";
    var map = {
      "index.html": "index.html",
      "": "index.html",
      "about.html": "about.html",
      "treatments.html": "treatments.html",
      "panchkarma.html": "panchkarma.html",
      "testimonials.html": "testimonials.html",
      "gallery.html": "gallery.html",
      "blog.html": "blog.html",
      "contact.html": "contact.html",
      "appointment.html": "appointment.html"
    };
    var current = map[path] || (path.indexOf("blog-") === 0 ? "blog.html" : "");
    if (!current) return;
    $$(".nav-links a, .mobile-menu a").forEach(function (a) {
      var href = (a.getAttribute("href") || "").split("/").pop();
      if (href === current && !a.classList.contains("nav-cta") && !a.classList.contains("mobile-cta")) {
        a.classList.add("is-active");
        a.setAttribute("aria-current", "page");
      }
    });
  })();

  /* ---------------- Count-up numbers ---------------- */
  function animateCount(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var suffix = el.getAttribute("data-suffix") || "";
    var decimals = parseInt(el.getAttribute("data-decimals") || "0", 10);
    if (isNaN(target)) return;
    if (reduceMotion) {
      el.textContent = target.toFixed(decimals) + suffix;
      return;
    }
    var duration = 1800;
    var start = null;
    var finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      el.textContent = target.toFixed(decimals) + suffix;
    }
    window.setTimeout(finish, duration + 400);
    function step(ts) {
      if (finished) return;
      if (!start) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      /* easeOutExpo: fast start, long soft settle */
      var eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      el.textContent = (target * eased).toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(step);
      else finish();
    }
    requestAnimationFrame(step);
  }

  var counters = $$("[data-count]");
  if (counters.length) {
    if ("IntersectionObserver" in window) {
      var cObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            cObs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.5 });
      counters.forEach(function (c) { cObs.observe(c); });
    } else {
      counters.forEach(animateCount);
    }
  }

  /* ---------------- Testimonial carousel ---------------- */
  $$("[data-carousel]").forEach(function (root) {
    var track = $(".carousel__track", root);
    var slides = $$(".carousel__slide", root);
    var prev = $("[data-carousel-prev]", root);
    var next = $("[data-carousel-next]", root);
    var dotsWrap = $(".carousel__dots", root);
    var index = 0;
    if (!track || !slides.length) return;

    slides.forEach(function (_, i) {
      var b = document.createElement("button");
      b.className = "carousel__dot" + (i === 0 ? " is-active" : "");
      b.type = "button";
      b.setAttribute("aria-label", "Go to review slide " + (i + 1));
      b.addEventListener("click", function () { go(i); });
      if (dotsWrap) dotsWrap.appendChild(b);
    });
    var dots = $$(".carousel__dot", root);

    function go(i) {
      index = (i + slides.length) % slides.length;
      track.style.transform = "translateX(-" + index * 100 + "%)";
      dots.forEach(function (d, di) { d.classList.toggle("is-active", di === index); });
      slides.forEach(function (s, si) { s.setAttribute("aria-hidden", si === index ? "false" : "true"); });
    }

    if (prev) prev.addEventListener("click", function () { go(index - 1); });
    if (next) next.addEventListener("click", function () { go(index + 1); });

    root.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); go(index - 1); }
      if (e.key === "ArrowRight") { e.preventDefault(); go(index + 1); }
    });

    /* swipe */
    var startX = null;
    track.addEventListener("touchstart", function (e) { startX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener("touchend", function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 45) go(index + (dx < 0 ? 1 : -1));
      startX = null;
    });

    go(0);
  });

  /* ---------------- Gallery lightbox ---------------- */
  var lightbox = $(".lightbox");

  function openLightbox(title, sub, icon) {
    if (!lightbox) return;
    var t = $(".lightbox__inner h3", lightbox);
    var p = $(".lightbox__inner p", lightbox);
    var big = $(".lightbox__inner .big", lightbox);
    if (t) t.textContent = title || "";
    if (p) p.textContent = sub || "";
    if (big) big.textContent = icon || "🌿";
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    if (!lightbox || !lightbox.classList.contains("is-open")) return;
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  $$(".gallery-tile").forEach(function (tile) {
    tile.addEventListener("click", function () {
      openLightbox(
        tile.getAttribute("data-title"),
        tile.getAttribute("data-sub"),
        tile.getAttribute("data-icon")
      );
    });
    tile.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        tile.click();
      }
    });
  });

  if (lightbox) {
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox || e.target.classList.contains("lightbox__close")) closeLightbox();
    });
  }

  /* ---------------- Scroll to top ---------------- */
  if (fabTop) {
    fabTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  }

  /* ---------------- Reveal on scroll ---------------- */
  var reveals = $$(".reveal");
  if (reveals.length) {
    if ("IntersectionObserver" in window && !reduceMotion) {
      var rObs = new IntersectionObserver(function (entries) {
        var shown = 0;
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          /* stagger items that enter together for a softer cascade */
          var delay = Math.min(shown * 70, 280);
          if (delay) entry.target.style.setProperty("--reveal-delay", delay + "ms");
          entry.target.classList.add("is-visible");
          rObs.unobserve(entry.target);
          shown++;
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -60px 0px" });
      reveals.forEach(function (el) { rObs.observe(el); });
    } else {
      reveals.forEach(function (el) { el.classList.add("is-visible"); });
    }
  }

  /* ---------------- Appointment forms ---------------- */
  function buildWaText(data) {
    var lines = [
      "Namaste Dr. Umesh Shukla 🙏",
      "",
      "I would like to book an appointment.",
      "",
      "Name: " + data.name,
      "Phone: " + data.phone,
      "Condition: " + data.condition
    ];
    if (data.city) lines.push("City: " + data.city);
    if (data.time) lines.push("Preferred Time: " + data.time);
    if (data.message) lines.push("Message: " + data.message);
    return lines.join("\n");
  }

  $$("form[data-appointment-form]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true;

      $$(".field", form).forEach(function (f) { f.classList.remove("has-error"); });

      var name = form.querySelector('[name="name"]');
      var phone = form.querySelector('[name="phone"]');
      var condition = form.querySelector('[name="condition"]');
      var city = form.querySelector('[name="city"]');
      var time = form.querySelector('[name="time"]');
      var message = form.querySelector('[name="message"]');

      function fail(field, msg) {
        if (!field) return;
        var wrap = field.closest(".field");
        if (wrap) {
          wrap.classList.add("has-error");
          var err = wrap.querySelector(".error");
          if (!err) {
            err = document.createElement("span");
            err.className = "error";
            wrap.appendChild(err);
          }
          if (msg) err.textContent = msg;
        }
        ok = false;
      }

      if (!name || !name.value.trim()) fail(name, "Please enter your full name");
      else if (name.value.trim().length < 2) fail(name, "Please enter a valid name");

      var digits = phone ? phone.value.replace(/\D/g, "") : "";
      if (!phone || !phone.value.trim()) fail(phone, "Please enter your phone number");
      else if (digits.length < 10) fail(phone, "Please enter a valid 10-digit number");

      if (!condition || !condition.value) fail(condition, "Please select your condition");

      if (!ok) {
        var firstError = form.querySelector(".has-error input, .has-error select, .has-error textarea");
        if (firstError) firstError.focus();
        return;
      }

      var data = {
        name: name.value.trim(),
        phone: phone.value.trim(),
        condition: condition.value,
        city: city ? city.value.trim() : "",
        time: time ? time.value : "",
        message: message ? message.value.trim() : ""
      };

      var success = form.parentNode.querySelector(".form-success") || $(".form-success", form.parentNode);
      if (!success) {
        success = document.createElement("div");
        success.className = "form-success";
        success.style.padding = "26px 6px";
        success.style.display = "none";
        success.setAttribute("role", "status");
        success.setAttribute("aria-live", "polite");
        success.innerHTML =
          '<span class="tick">✅</span>' +
          "<h4>Appointment Request Received!</h4>" +
          "<p>Thank you. Your request has been recorded and we will contact you within 24 hours on <strong data-success-phone>your number</strong>.</p>" +
          '<p style="margin-top:10px">Opening WhatsApp so you can confirm instantly…</p>' +
          '<a class="btn btn--green" href="' + WA_LINK + '" target="_blank" rel="noopener">💬 Continue on WhatsApp</a>';
        (form.closest(".form-card") || form.parentNode).appendChild(success);
      }

      var card = form.closest(".form-card");
      if (card) {
        $$(":scope > h3, :scope > p", card).forEach(function (el) { el.style.display = "none"; });
      }
      form.style.display = "none";
      if (success) {
        success.classList.add("is-shown");
        success.style.display = "block";
        var num = success.querySelector("[data-success-phone]");
        if (num) num.textContent = data.phone;
      }

      var waUrl = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(buildWaText(data));
      window.setTimeout(function () {
        window.open(waUrl, "_blank", "noopener");
      }, 1500);
    });

    $$("input, select, textarea", form).forEach(function (input) {
      input.addEventListener("input", function () {
        var wrap = input.closest(".field");
        if (wrap) wrap.classList.remove("has-error");
      });
      input.addEventListener("change", function () {
        var wrap = input.closest(".field");
        if (wrap) wrap.classList.remove("has-error");
      });
    });
  });

  /* ---------------- Current year ---------------- */
  $$("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
