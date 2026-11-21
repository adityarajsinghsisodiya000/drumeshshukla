"use strict";
/* Password verification against a scrypt hash stored in the environment */
const crypto = require("node:crypto");

function checkPassword(password) {
  const stored = process.env.ADMIN_PASSWORD_HASH || "";
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  let salt;
  let expected;
  try {
    salt = Buffer.from(parts[1], "hex");
    expected = Buffer.from(parts[2], "hex");
  } catch (e) {
    return false;
  }
  if (!salt.length || !expected.length) return false;
  const derived = crypto.scryptSync(String(password), salt, expected.length);
  return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
}

module.exports = { checkPassword };
