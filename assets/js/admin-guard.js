/* ============================================================
   ADMIN GUARD — surfaces script errors instead of failing silently
   ============================================================ */
(function () {
  "use strict";

  function bar(message) {
    var node = document.getElementById("adminAlert");
    if (!node) {
      node = document.createElement("div");
      node.id = "adminAlert";
      node.className = "admin-alert";
      node.setAttribute("role", "alert");
      document.body.insertBefore(node, document.body.firstChild);
    }
    node.textContent = message;
  }

  window.addEventListener("error", function (event) {
    var msg = event && event.message ? event.message : "Unknown script error";
    bar("Console script error: " + msg + " — hard refresh karke dekhein (Ctrl+Shift+R).");
  });

  window.addEventListener("unhandledrejection", function (event) {
    var reason = event && event.reason ? String(event.reason) : "Unknown promise error";
    bar("Console script error: " + reason);
  });

  window.addEventListener("load", function () {
    window.setTimeout(function () {
      if (!window.__mahakalAdminReady) {
        bar("Admin script load nahi hua (extension ya purana cache block kar raha ho sakta hai). Ctrl+Shift+R dabaiye.");
      }
    }, 1800);
  });
})();
