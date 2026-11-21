"use strict";
/* Signed session cookie helpers (Node runtime) */
const crypto = require("node:crypto");

const COOKIE = "mkc_admin";
const SESSION_SECONDS = 8 * 60 * 60;
const REMEMBER_SECONDS = 30 * 24 * 60 * 60;

function secret() {
  return process.env.SESSION_SECRET || "";
}

function sign(payload) {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

function createToken(seconds) {
  const payload = Buffer.from(
    JSON.stringify({ sub: "admin", exp: Date.now() + seconds * 1000 })
  ).toString("base64url");
  return payload + "." + sign(payload);
}

function verifyToken(token) {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const expected = sign(parts[0]);
  if (expected.length !== parts[1].length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts[1]))) return false;
  try {
    const data = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    return data.sub === "admin" && typeof data.exp === "number" && data.exp > Date.now();
  } catch (e) {
    return false;
  }
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  const out = {};
  header.split(";").forEach(function (pair) {
    const index = pair.indexOf("=");
    if (index < 0) return;
    out[pair.slice(0, index).trim()] = decodeURIComponent(pair.slice(index + 1).trim());
  });
  return out;
}

function isAuthed(req) {
  return verifyToken(parseCookies(req)[COOKIE]);
}

function setCookie(remember) {
  const seconds = remember ? REMEMBER_SECONDS : SESSION_SECONDS;
  return (
    COOKIE + "=" + createToken(seconds) + "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=" + seconds
  );
}

function clearCookie() {
  return COOKIE + "=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
}

module.exports = { COOKIE, isAuthed, setCookie, clearCookie, parseCookies, verifyToken };
