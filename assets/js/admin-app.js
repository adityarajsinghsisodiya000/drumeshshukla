/* ============================================================
   ADMIN CONSOLE — enquiries inbox + site health
   All data comes from /api/leads (server-verified session).
   ============================================================ */
(function () {
  "use strict";

  window.__mahakalAdminReady = true;

  var REPO = "adityarajsinghsisodiya000/drumeshshukla";
  var STATUS_LABEL = { new: "New", contacted: "Contacted", booked: "Booked", closed: "Closed" };
  var PAGES = [
    "/", "/about", "/treatments", "/panchkarma", "/testimonials", "/gallery",
    "/blog", "/contact", "/appointment",
    "/blog/can-slip-disc-heal-without-surgery", "/blog/what-is-panchkarma",
    "/blog/ayurvedic-treatment-sciatica", "/blog/why-ayurveda-for-spine",
    "/blog/shirodhara-migraine-insomnia", "/blog/panchkarma-immune-system"
  ];

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var state = { leads: [], filter: "all", query: "" };

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function fmtDate(iso) {
    var date = new Date(iso);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleString("en-IN", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
    });
  }

  function waLink(lead) {
    var digits = String(lead.phone || "").replace(/\D/g, "");
    if (digits.length === 10) digits = "91" + digits;
    var text = "Namaste " + lead.name + ", Dr. Umesh Shukla ki clinic se baat kar rahe hain. Aapki appointment request mil gayi hai";
    if (lead.condition) text += " (" + lead.condition + ")";
    text += ". Kab visit karna chahenge?";
    return "https://wa.me/" + digits + "?text=" + encodeURIComponent(text);
  }

  /* ---------------- leads ---------------- */
  function loadLeads(silent) {
    var list = $("#leadList");
    var msg = $("#leadMsg");
    if (!silent && list && !state.leads.length) list.textContent = "Loading…";
    fetch("/api/leads", { credentials: "same-origin", cache: "no-store" })
      .then(function (res) {
        if (res.status === 401) {
          location.href = "/admin/login";
          return null;
        }
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!data) return;
        state.leads = Array.isArray(data.leads) ? data.leads : [];
        if (msg) msg.textContent = "";
        render();
      })
      .catch(function () {
        if (msg) {
          msg.textContent = "Enquiries load nahi ho payi. Refresh karke dekhein.";
          msg.classList.add("is-error");
        }
        if (list) {
          list.textContent = "";
          list.appendChild(el("p", "hint", "Server se connection nahi bana."));
        }
      });
  }

  function visibleLeads() {
    var query = state.query.trim().toLowerCase();
    return state.leads.filter(function (lead) {
      if (state.filter !== "all" && (lead.status || "new") !== state.filter) return false;
      if (!query) return true;
      return [lead.name, lead.phone, lead.condition, lead.city, lead.message]
        .join(" ").toLowerCase().indexOf(query) >= 0;
    });
  }

  function render() {
    var list = $("#leadList");
    if (!list) return;
    list.textContent = "";

    var counts = { new: 0, contacted: 0, booked: 0, closed: 0 };
    state.leads.forEach(function (lead) {
      var key = lead.status && counts.hasOwnProperty(lead.status) ? lead.status : "new";
      counts[key]++;
    });

    var stats = $("#leadStats");
    if (stats) {
      stats.textContent = "";
      Object.keys(STATUS_LABEL).forEach(function (key) {
        var chip = el("span", "chip chip--" + key);
        chip.appendChild(el("strong", null, String(counts[key])));
        chip.appendChild(el("span", null, STATUS_LABEL[key]));
        stats.appendChild(chip);
      });
    }

    var badge = $("#newCount");
    if (badge) {
      badge.textContent = String(counts.new);
      badge.hidden = counts.new === 0;
    }

    var rows = visibleLeads();
    if (!rows.length) {
      list.appendChild(el("p", "hint", state.leads.length ? "Is filter par koi enquiry nahi hai." : "Abhi tak koi enquiry nahi aayi. Jab koi form bharega, yahan dikhega."));
      return;
    }

    rows.forEach(function (lead) {
      var card = el("article", "lead");

      var head = el("div", "lead__head");
      var who = el("div", "lead__who");
      who.appendChild(el("strong", null, lead.name || "—"));
      var meta = [lead.condition, lead.city, lead.time].filter(Boolean).join(" · ");
      if (meta) who.appendChild(el("span", "lead__meta", meta));
      head.appendChild(who);

      var status = lead.status && STATUS_LABEL[lead.status] ? lead.status : "new";
      head.appendChild(el("span", "lead__status lead__status--" + status, STATUS_LABEL[status]));
      card.appendChild(head);

      if (lead.message) card.appendChild(el("p", "lead__text", lead.message));

      var actions = el("div", "lead__actions");

      var phone = el("a", "lead__phone", lead.phone || "");
      phone.href = "tel:" + String(lead.phone || "").replace(/[^\d+]/g, "");
      actions.appendChild(phone);

      var wa = el("a", "btn btn--wa btn--sm", "WhatsApp");
      wa.href = waLink(lead);
      wa.target = "_blank";
      wa.rel = "noopener";
      actions.appendChild(wa);

      var select = el("select", "lead__select");
      select.setAttribute("aria-label", "Change status for " + (lead.name || "enquiry"));
      Object.keys(STATUS_LABEL).forEach(function (key) {
        var option = el("option", null, STATUS_LABEL[key]);
        option.value = key;
        if (key === status) option.selected = true;
        select.appendChild(option);
      });
      select.addEventListener("change", function () {
        setStatus(lead.id, select.value, select);
      });
      actions.appendChild(select);

      var remove = el("button", "lead__delete", "Delete");
      remove.type = "button";
      remove.addEventListener("click", function () {
        if (!window.confirm("Ye enquiry delete karni hai?")) return;
        removeLead(lead.id, remove);
      });
      actions.appendChild(remove);

      card.appendChild(actions);

      var foot = el("div", "lead__foot");
      foot.appendChild(el("span", null, "Received " + fmtDate(lead.createdAt)));
      if (lead.page) foot.appendChild(el("span", null, lead.page));
      card.appendChild(foot);

      list.appendChild(card);
    });
  }

  function setStatus(id, status, select) {
    var msg = $("#leadMsg");
    select.disabled = true;
    fetch("/api/leads", {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: id, status: status })
    })
      .then(function (res) {
        if (res.status === 401) { location.href = "/admin/login"; return null; }
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!data) return;
        state.leads = data.leads || state.leads;
        render();
        if (msg) { msg.textContent = "Status updated."; msg.classList.remove("is-error"); }
      })
      .catch(function () {
        select.disabled = false;
        if (msg) { msg.textContent = "Status update nahi hua. Dobara try karein."; msg.classList.add("is-error"); }
      });
  }

  function removeLead(id, button) {
    var msg = $("#leadMsg");
    button.disabled = true;
    fetch("/api/leads", {
      method: "DELETE",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: id })
    })
      .then(function (res) {
        if (res.status === 401) { location.href = "/admin/login"; return null; }
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!data) return;
        state.leads = data.leads || [];
        render();
        if (msg) { msg.textContent = "Enquiry deleted."; msg.classList.remove("is-error"); }
      })
      .catch(function () {
        button.disabled = false;
        if (msg) { msg.textContent = "Delete nahi hua. Dobara try karein."; msg.classList.add("is-error"); }
      });
  }

  function exportCsv() {
    var rows = [["Received", "Name", "Phone", "Condition", "City", "Preferred time", "Message", "Status", "Page"]];
    visibleLeads().forEach(function (lead) {
      rows.push([
        fmtDate(lead.createdAt), lead.name, lead.phone, lead.condition, lead.city,
        lead.time, lead.message, STATUS_LABEL[lead.status] || "New", lead.page
      ]);
    });
    var csv = rows.map(function (row) {
      return row.map(function (cell) {
        return '"' + String(cell == null ? "" : cell).replace(/"/g, '""') + '"';
      }).join(",");
    }).join("\r\n");
    var blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "enquiries-" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
  }

  /* ---------------- site health ---------------- */
  var HEADER_TESTS = [
    ["strict-transport-security", "HSTS (HTTPS enforced)", "Forces browsers to use HTTPS for a year."],
    ["content-security-policy", "Content-Security-Policy", "Limits which scripts, styles and hosts may load."],
    ["x-content-type-options", "MIME sniffing blocked", "Stops browsers guessing a file type."],
    ["x-frame-options", "Clickjacking protection", "Prevents framing by other domains."],
    ["referrer-policy", "Referrer policy", "Limits URL data leaked to other sites."],
    ["permissions-policy", "Permissions policy", "Disables camera, mic, location and payment APIs."],
    ["cross-origin-opener-policy", "Cross-origin isolation", "Blocks cross-window scripting tricks."]
  ];

  function addCheck(grid, state2, title, detail) {
    var item = el("div", "check " + state2);
    item.appendChild(el("span", "check__icon", state2 === "ok" ? "✓" : state2 === "warn" ? "!" : "×"));
    var body = el("div", "check__body");
    body.appendChild(el("strong", null, title));
    body.appendChild(el("span", null, detail));
    item.appendChild(body);
    grid.appendChild(item);
  }

  function checkLive() {
    var value = $("#statLive");
    var meta = $("#statLiveMeta");
    if (!value) return;
    var started = performance.now();
    fetch("/?probe=" + Date.now(), { cache: "no-store" })
      .then(function (res) {
        value.textContent = res.ok ? "Online" : "Error " + res.status;
        value.className = "stat__value " + (res.ok ? "is-ok" : "is-bad");
        meta.textContent = "response in " + Math.round(performance.now() - started) + " ms";
      })
      .catch(function () {
        value.textContent = "Unreachable";
        value.className = "stat__value is-bad";
      });
  }

  function checkCommit() {
    var value = $("#statCommit");
    var meta = $("#statCommitMeta");
    if (!value) return;
    fetch("https://api.github.com/repos/" + REPO + "/commits?per_page=1", {
      headers: { Accept: "application/vnd.github+json" }
    })
      .then(function (res) { return res.ok ? res.json() : Promise.reject(); })
      .then(function (list) {
        value.textContent = list[0].sha.slice(0, 7);
        meta.textContent = list[0].commit.message.split("\n")[0].slice(0, 40);
      })
      .catch(function () { value.textContent = "—"; meta.textContent = "GitHub API unavailable"; });
  }

  function checkPages() {
    var tbody = $("#pagesTable tbody");
    if (!tbody) return;
    tbody.textContent = "";
    var ok = 0;
    PAGES.forEach(function (path) {
      var row = el("tr");
      var route = el("td");
      var link = el("a", null, path);
      link.href = path;
      link.target = "_blank";
      link.rel = "noopener";
      route.appendChild(link);
      var status = el("td", null, "…");
      var size = el("td", null, "—");
      var time = el("td", null, "—");
      row.appendChild(route);
      row.appendChild(status);
      row.appendChild(size);
      row.appendChild(time);
      tbody.appendChild(row);

      var started = performance.now();
      fetch(path + "?probe=" + Date.now(), { cache: "no-store" })
        .then(function (res) { return res.text().then(function (text) { return { res: res, text: text }; }); })
        .then(function (out) {
          status.textContent = "";
          status.appendChild(el("span", out.res.ok ? "pill-ok" : "pill-bad", String(out.res.status)));
          size.textContent = (out.text.length / 1024).toFixed(1) + " KB";
          time.textContent = Math.round(performance.now() - started) + " ms";
          if (out.res.ok) ok++;
          var count = $("#statPages");
          if (count) {
            count.textContent = ok + " / " + PAGES.length;
            count.className = "stat__value " + (ok === PAGES.length ? "is-ok" : "is-bad");
          }
        })
        .catch(function () { status.textContent = "fail"; });
    });
  }

  function runSecurity() {
    var grid = $("#checkGrid");
    if (!grid) return;
    grid.textContent = "";
    var ok = 0;
    var total = 0;

    function settle() {
      var score = $("#statScore");
      var meta = $("#statScoreMeta");
      var pct = Math.round((ok / total) * 100);
      score.textContent = pct + "%";
      score.className = "stat__value " + (pct >= 90 ? "is-ok" : "is-bad");
      meta.textContent = ok + " of " + total + " checks passed";
    }

    fetch("/?probe=" + Date.now(), { cache: "no-store" })
      .then(function (res) {
        total++;
        if (location.protocol === "https:") { ok++; addCheck(grid, "ok", "HTTPS only", "Valid TLS certificate."); }
        else addCheck(grid, "bad", "HTTPS only", "Not served over HTTPS.");

        HEADER_TESTS.forEach(function (test) {
          total++;
          var value = res.headers.get(test[0]);
          if (value) { ok++; addCheck(grid, "ok", test[1], test[2] + " — " + value.slice(0, 90) + (value.length > 90 ? "…" : "")); }
          else addCheck(grid, "bad", test[1], "Header missing. " + test[2]);
        });
        return res.text();
      })
      .then(function (html) {
        total++;
        if (!/(?:src|href)="http:\/\//.test(html)) { ok++; addCheck(grid, "ok", "No mixed content", "Every asset and link is HTTPS."); }
        else addCheck(grid, "bad", "No mixed content", "Insecure http:// reference found.");

        total++;
        if (!/target="_blank"(?![^>]*rel=)/.test(html)) { ok++; addCheck(grid, "ok", "Safe external links", "New-tab links carry rel=noopener."); }
        else addCheck(grid, "bad", "Safe external links", "A new-tab link is missing rel=noopener.");

        total++;
        if (!/github_pat_|AIza[0-9A-Za-z_-]{20}|sk-[A-Za-z0-9]{20}/.test(html)) { ok++; addCheck(grid, "ok", "No secrets in markup", "No API keys or tokens in the HTML."); }
        else addCheck(grid, "bad", "No secrets in markup", "A token-like string appears in the HTML.");

        settle();
        return null;
      })
      .catch(function () {
        addCheck(grid, "bad", "Checks failed", "Request blocked or browser offline.");
        settle();
      });
  }

  /* ---------------- tabs, copy, boot ---------------- */
  function showTab(name, focusTab) {
    $$(".tab").forEach(function (btn) {
      var active = btn.getAttribute("data-tab") === name;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
      btn.setAttribute("tabindex", active ? "0" : "-1");
      if (active && focusTab) btn.focus();
    });
    $$(".panel").forEach(function (panel) {
      var active = panel.id === "panel-" + name;
      panel.classList.toggle("is-active", active);
      panel.hidden = !active;
    });
  }

  var tabButtons = $$(".tab");
  tabButtons.forEach(function (btn, index) {
    btn.setAttribute("tabindex", btn.classList.contains("is-active") ? "0" : "-1");
    btn.addEventListener("click", function () { showTab(btn.getAttribute("data-tab")); });
    btn.addEventListener("keydown", function (event) {
      var next = null;
      if (event.key === "ArrowRight") next = tabButtons[(index + 1) % tabButtons.length];
      else if (event.key === "ArrowLeft") next = tabButtons[(index - 1 + tabButtons.length) % tabButtons.length];
      else if (event.key === "Home") next = tabButtons[0];
      else if (event.key === "End") next = tabButtons[tabButtons.length - 1];
      if (!next) return;
      event.preventDefault();
      showTab(next.getAttribute("data-tab"), true);
    });
  });

  document.addEventListener("click", function (event) {
    var target = event.target;
    var btn = target && target.closest ? target.closest("[data-copy]") : null;
    if (!btn) return;
    var text = btn.getAttribute("data-copy");
    var original = btn.textContent;
    var done = function () {
      btn.textContent = "Copied";
      btn.classList.add("is-done");
      setTimeout(function () { btn.textContent = original; btn.classList.remove("is-done"); }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () {});
    }
  });

  var search = $("#search");
  if (search) {
    search.addEventListener("input", function () {
      state.query = search.value;
      render();
    });
  }

  var filter = $("#statusFilter");
  if (filter) {
    filter.addEventListener("change", function () {
      state.filter = filter.value;
      render();
    });
  }

  var refresh = $("#refreshLeads");
  if (refresh) refresh.addEventListener("click", function () { loadLeads(); });
  var csv = $("#exportCsv");
  if (csv) csv.addEventListener("click", exportCsv);

  var logout = $("#logout");
  if (logout) {
    logout.addEventListener("click", function () {
      fetch("/api/logout", { method: "POST", credentials: "same-origin" })
        .then(function () { location.href = "/admin/login"; })
        .catch(function () { location.href = "/admin/login"; });
    });
  }

  var health = $("#recheckHealth");
  if (health) {
    health.addEventListener("click", function () {
      checkLive();
      checkCommit();
      checkPages();
      runSecurity();
    });
  }

  var boot = $("#bootState");
  if (boot) {
    boot.textContent = "signed in";
    boot.classList.add("is-ok");
  }

  var year = $("#year");
  if (year) year.textContent = new Date().getFullYear();

  loadLeads();
  checkLive();
  checkCommit();
  checkPages();
  runSecurity();
})();
