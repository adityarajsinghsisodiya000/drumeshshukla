"use strict";
/* GET /api/enter?t=<ADMIN_ACCESS_TOKEN>  -> sets the admin session and redirects.
   This is a one-tap, bookmarkable login link for the owner's own devices.
   The token lives in the environment, so it can be rotated by changing the
   variable (which invalidates every saved link immediately). */
const crypto = require("node:crypto");
const { setCookie } = require("./_lib/session");

const hits = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 12;

function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded) return forwarded.split(",")[0].trim();
  return req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : "unknown";
}

function rateLimited(ip) {
  const now = Date.now();
  const entry = hits.get(ip) || { count: 0, start: now };
  if (now - entry.start > WINDOW_MS) {
    entry.count = 0;
    entry.start = now;
  }
  entry.count += 1;
  hits.set(ip, entry);
  return entry.count > MAX_PER_WINDOW;
}

function safeEqual(given, expected) {
  const a = Buffer.from(String(given || ""), "utf8");
  const b = Buffer.from(String(expected || ""), "utf8");
  if (!a.length || a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const expected = process.env.ADMIN_ACCESS_TOKEN || "";
  if (!expected || expected.length < 24) {
    res.status(503).json({ error: "not_configured" });
    return;
  }

  if (rateLimited(clientIp(req))) {
    res.status(429).json({ error: "too_many_requests" });
    return;
  }

  const url = new URL(req.url, "https://" + (req.headers.host || "localhost"));
  const token = url.searchParams.get("t") || "";

  if (!safeEqual(token, expected)) {
    /* Wrong or stale link: send the visitor to the normal password form. */
    res.status(302).setHeader("Location", "/admin/login");
    res.end();
    return;
  }

  res.setHeader("Set-Cookie", setCookie(true));
  res.status(302).setHeader("Location", "/admin");
  res.end();
};
