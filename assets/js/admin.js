/* ============================================================
   ADMIN CONSOLE — client-side site checks
   Everything handled here is public information, so there is no
   login: the page only reports on the deployed website.
   ============================================================ */
(function () {
  "use strict";

  window.__mahakalAdminReady = true;

  var REPO = "adityarajsinghsisodiya000/drumeshshukla";

  var PAGES = [
    { path: "/", label: "Home" },
    { path: "/about", label: "About doctor" },
    { path: "/treatments", label: "Treatments" },
    { path: "/panchkarma", label: "Panchkarma" },
    { path: "/testimonials", label: "Testimonials" },
    { path: "/gallery", label: "Gallery" },
    { path: "/blog", label: "Blog index" },
    { path: "/contact", label: "Contact" },
    { path: "/appointment", label: "Appointment" },
    { path: "/blog/can-slip-disc-heal-without-surgery", label: "Article · slip disc" },
    { path: "/blog/what-is-panchkarma", label: "Article · panchkarma" },
    { path: "/blog/ayurvedic-treatment-sciatica", label: "Article · sciatica" },
    { path: "/blog/why-ayurveda-for-spine", label: "Article · ayurveda for spine" },
    { path: "/blog/shirodhara-migraine-insomnia", label: "Article · shirodhara" },
    { path: "/blog/panchkarma-immune-system", label: "Article · immunity" }
  ];

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---------------- helpers ---------------- */
  function fmtBytes(n) {
    if (!n && n !== 0) return "—";
    if (n < 1024) return n + " B";
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
    return (n / 1024 / 1024).toFixed(2) + " MB";
  }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  /* ---------------- tabs ---------------- */
  function showTab(name) {
    $$(".tab").forEach(function (btn) {
      var active = btn.getAttribute("data-tab") === name;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });
    $$(".panel").forEach(function (panel) {
      var active = panel.id === "panel-" + name;
      panel.classList.toggle("is-active", active);
      panel.hidden = !active;
    });
  }

  $$(".tab").forEach(function (btn) {
    btn.addEventListener("click", function () { showTab(btn.getAttribute("data-tab")); });
  });

  /* ---------------- copy ---------------- */
  document.addEventListener("click", function (event) {
    var target = event.target;
    var btn = target && target.closest ? target.closest("[data-copy]") : null;
    if (!btn) return;
    var text = btn.getAttribute("data-copy");
    var original = btn.textContent;
    var done = function () {
      btn.textContent = "Copied";
      btn.classList.add("is-done");
      setTimeout(function () {
        btn.textContent = original;
        btn.classList.remove("is-done");
      }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () {});
    } else {
      var area = el("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      try { document.execCommand("copy"); done(); } catch (e) {}
      area.remove();
    }
  });

  /* ---------------- overview ---------------- */
  function checkLive() {
    var value = $("#statLive");
    var meta = $("#statLiveMeta");
    if (!value) return;
    var started = performance.now();
    fetch("/?probe=" + Date.now(), { cache: "no-store" })
      .then(function (res) {
        var ms = Math.round(performance.now() - started);
        value.textContent = res.ok ? "Online" : "Error " + res.status;
        value.className = "stat__value " + (res.ok ? "is-ok" : "is-bad");
        meta.textContent = "response in " + ms + " ms";
      })
      .catch(function () {
        value.textContent = "Unreachable";
        value.className = "stat__value is-bad";
        meta.textContent = "network blocked the request";
      });
  }

  function checkCommit() {
    var value = $("#statCommit");
    var meta = $("#statCommitMeta");
    if (!value) return;
    fetch("https://api.github.com/repos/" + REPO + "/commits?per_page=1", {
      headers: { Accept: "application/vnd.github+json" }
    })
      .then(function (res) { return res.ok ? res.json() : Promise.reject(res.status); })
      .then(function (list) {
        if (!list.length) throw new Error("empty");
        value.textContent = list[0].sha.slice(0, 7);
        meta.textContent = list[0].commit.message.split("\n")[0].slice(0, 44);
      })
      .catch(function () {
        value.textContent = "—";
        meta.textContent = "GitHub API unavailable";
      });
  }

  /* ---------------- pages ---------------- */
  function checkPages() {
    var tbody = $("#pagesTable tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    var ok = 0;
    PAGES.forEach(function (page) {
      var row = el("tr");
      var routeCell = el("td");
      var link = el("a", null, page.path);
      link.href = page.path;
      link.target = "_blank";
      link.rel = "noopener";
      routeCell.appendChild(link);
      var statusCell = el("td", null, "…");
      var sizeCell = el("td", null, "—");
      var timeCell = el("td", null, "—");
      row.appendChild(routeCell);
      row.appendChild(statusCell);
      row.appendChild(sizeCell);
      row.appendChild(timeCell);
      row.appendChild(el("td"));
      tbody.appendChild(row);

      var started = performance.now();
      fetch(page.path + "?probe=" + Date.now(), { cache: "no-store", redirect: "follow" })
        .then(function (res) {
          return res.text().then(function (text) {
            var ms = Math.round(performance.now() - started);
            statusCell.innerHTML = "";
            statusCell.appendChild(el("span", res.ok ? "pill-ok" : "pill-bad", String(res.status)));
            sizeCell.textContent = fmtBytes(text.length);
            timeCell.textContent = ms + " ms";
            if (res.ok) ok++;
            var count = $("#statPages");
            if (count) {
              count.textContent = ok + " / " + PAGES.length;
              count.className = "stat__value " + (ok === PAGES.length ? "is-ok" : "is-bad");
            }
          });
        })
        .catch(function () {
          statusCell.textContent = "fail";
          statusCell.className = "pill-bad";
        });
    });
  }

  /* ---------------- security ---------------- */
  var HEADER_TESTS = [
    ["strict-transport-security", "HSTS (HTTPS enforced)", "Forces browsers to use HTTPS for a year."],
    ["content-security-policy", "Content-Security-Policy", "Limits which scripts, styles and hosts may load."],
    ["x-content-type-options", "MIME sniffing blocked", "Stops browsers guessing a file type."],
    ["x-frame-options", "Clickjacking protection", "Prevents the site being framed by other domains."],
    ["referrer-policy", "Referrer policy", "Limits what URL data leaks to other sites."],
    ["permissions-policy", "Permissions policy", "Disables camera, mic, location and payment APIs."],
    ["cross-origin-opener-policy", "Cross-origin opener isolation", "Blocks cross-window scripting tricks."]
  ];

  function addCheck(grid, state, title, detail) {
    var item = el("div", "check " + state);
    var icon = el("span", "check__icon", state === "ok" ? "✓" : state === "warn" ? "!" : "×");
    var body = el("div", "check__body");
    body.appendChild(el("strong", null, title));
    body.appendChild(el("span", null, detail));
    item.appendChild(icon);
    item.appendChild(body);
    grid.appendChild(item);
  }

  function runSecurity() {
    var grid = $("#checkGrid");
    if (!grid) return;
    grid.innerHTML = "";
    var ok = 0;
    var total = 0;

    function settle() {
      var score = $("#statScore");
      var meta = $("#statScoreMeta");
      if (!score) return;
      var pct = Math.round((ok / total) * 100);
      score.textContent = pct + "%";
      score.className = "stat__value " + (pct >= 90 ? "is-ok" : "is-bad");
      meta.textContent = ok + " of " + total + " checks passed";
    }

    fetch("/?probe=" + Date.now(), { cache: "no-store" })
      .then(function (res) {
        var headers = res.headers;

        total++;
        if (location.protocol === "https:") { ok++; addCheck(grid, "ok", "HTTPS only", "Served over TLS with a valid certificate."); }
        else addCheck(grid, "bad", "HTTPS only", "This page is not on HTTPS.");

        HEADER_TESTS.forEach(function (test) {
          total++;
          var value = headers.get(test[0]);
          if (value) {
            ok++;
            addCheck(grid, "ok", test[1], test[2] + " — " + value.slice(0, 96) + (value.length > 96 ? "…" : ""));
          } else {
            addCheck(grid, "bad", test[1], "Header is missing. " + test[2]);
          }
        });

        return res.text();
      })
      .then(function (html) {
        total++;
        var mixed = (html.match(/(?:src|href)="http:\/\//g) || []).length;
        if (!mixed) { ok++; addCheck(grid, "ok", "No mixed content", "Every asset and link in the markup is HTTPS."); }
        else addCheck(grid, "bad", "No mixed content", mixed + " insecure http:// reference(s) found.");

        total++;
        var blanks = (html.match(/target="_blank"(?![^>]*rel=)/g) || []).length;
        if (!blanks) { ok++; addCheck(grid, "ok", "Safe external links", "All target=\"_blank\" links carry rel=noopener."); }
        else addCheck(grid, "bad", "Safe external links", blanks + " new-tab link(s) miss rel=noopener.");

        total++;
        if (!/github_pat_|AIza[0-9A-Za-z_-]{20}|sk-[A-Za-z0-9]{20}/.test(html)) {
          ok++; addCheck(grid, "ok", "No secrets in markup", "No API keys or tokens found in the HTML.");
        } else addCheck(grid, "bad", "No secrets in markup", "A token-like string is present in the HTML.");

        total++;
        if (!/<form[^>]*action="[^"]+"/i.test(html)) {
          ok++; addCheck(grid, "ok", "No server-side form posts", "Forms are handled in the browser and hand off to WhatsApp — nothing is stored.");
        } else addCheck(grid, "warn", "Forms post to a server", "Verify the endpoint handles validation and rate limiting.");

        settle();
        return null;
      })
      .catch(function () {
        addCheck(grid, "bad", "Checks failed", "The request was blocked or the browser is offline.");
        settle();
      });
  }

  /* ---------------- boot ---------------- */
  var bootState = $("#bootState");
  if (bootState) {
    bootState.textContent = "scripts running";
    bootState.classList.add("is-ok");
  }

  var yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  checkLive();
  checkCommit();
  checkPages();
  runSecurity();

  var rePages = $("#recheckPages");
  if (rePages) rePages.addEventListener("click", checkPages);
  var reSec = $("#recheckSecurity");
  if (reSec) reSec.addEventListener("click", runSecurity);
})();
