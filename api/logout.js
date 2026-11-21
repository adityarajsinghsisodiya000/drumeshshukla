"use strict";
/* POST /api/logout -> clears the admin session cookie */
const { clearCookie } = require("./_lib/session");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Set-Cookie", clearCookie());
  res.status(200).json({ ok: true });
};
