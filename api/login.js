"use strict";
/* POST /api/login  { password }  -> sets an HttpOnly session cookie */
const { checkPassword } = require("./_lib/password");
const { setCookie } = require("./_lib/session");

const attempts = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;

function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded) return forwarded.split(",")[0].trim();
  return req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : "unknown";
}

function tooMany(ip) {
  const now = Date.now();
  const entry = attempts.get(ip) || { count: 0, start: now };
  if (now - entry.start > WINDOW_MS) {
    entry.count = 0;
    entry.start = now;
  }
  entry.count += 1;
  attempts.set(ip, entry);
  return entry.count > MAX_ATTEMPTS;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const ip = clientIp(req);
  if (tooMany(ip)) {
    res.status(429).json({ error: "too_many_attempts", message: "Bahut zyada koshish. 10 minute baad try karein." });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = {};
    }
  }
  const password = body && typeof body.password === "string" ? body.password : "";
  if (!password || password.length > 200) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }

  if (!checkPassword(password)) {
    res.status(401).json({ error: "invalid_credentials", message: "Galat password." });
    return;
  }

  attempts.delete(ip);
  res.setHeader("Set-Cookie", setCookie());
  res.status(200).json({ ok: true });
};
