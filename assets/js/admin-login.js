/* Login form -> POST /api/login */
(function () {
  "use strict";

  var form = document.getElementById("loginForm");
  var input = document.getElementById("password");
  var error = document.getElementById("loginErr");
  var button = document.getElementById("loginBtn");
  var toggle = document.getElementById("togglePass");

  if (toggle) {
    toggle.addEventListener("click", function () {
      var show = input.type === "password";
      input.type = show ? "text" : "password";
      toggle.textContent = show ? "Hide" : "Show";
      toggle.setAttribute("aria-pressed", show ? "true" : "false");
    });
  }

  if (!form) return;

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var value = input.value;
    error.textContent = "";

    if (value.length < 6) {
      error.textContent = "Password must be at least 6 characters.";
      input.focus();
      return;
    }

    button.disabled = true;
    button.textContent = "Signing in…";

    fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ password: value })
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (body) {
          return { status: res.status, body: body };
        });
      })
      .then(function (result) {
        if (result.status === 200) {
          var next = new URLSearchParams(location.search).get("next");
          location.href = next && next.indexOf("/admin") === 0 ? next : "/admin";
          return;
        }
        if (result.status === 429) {
          error.textContent = "Bahut zyada koshish. 10 minute baad try karein.";
        } else if (result.status === 401) {
          error.textContent = "Galat password. Dobara try karein.";
        } else {
          error.textContent = "Login server tak nahi pahuncha. Thodi der baad try karein.";
        }
        button.disabled = false;
        button.textContent = "Sign in";
        input.select();
      })
      .catch(function () {
        error.textContent = "Network error. Internet check karke dobara try karein.";
        button.disabled = false;
        button.textContent = "Sign in";
      });
  });
})();
