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
    bar("Script error: " + msg + " — page reload karke dekhein (Ctrl+Shift+R).");
  });

  window.addEventListener("unhandledrejection", function (event) {
    var reason = event && event.reason ? String(event.reason) : "Unknown promise error";
    bar("Script error: " + reason);
  });

  window.addEventListener("load", function () {
    window.setTimeout(function () {
      if (window.__mahakalAdminReady) return;
      bar(
        "Page script load nahi hua — browser extension ya purana cache block kar raha ho sakta hai. Ctrl+Shift+R dabaiye, ya incognito me kholiye."
      );
    }, 2200);
  });
})();
