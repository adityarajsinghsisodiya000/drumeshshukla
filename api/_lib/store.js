"use strict";
/* Lead storage backed by a dedicated git branch in the project repository.
   The payload is encrypted with AES-256-GCM before it is committed, so the
   public repository only ever contains ciphertext. The branch never triggers
   a deployment (see vercel.json -> git.deploymentEnabled). */
const crypto = require("node:crypto");

const REPO = process.env.GH_DATA_REPO || "adityarajsinghsisodiya000/drumeshshukla";
const BRANCH = process.env.GH_DATA_BRANCH || "data";
const FILE = "data/leads.enc";
const MAX_LEADS = 2000;
const API = "https://api.github.com";

function token() {
  return process.env.GH_DATA_TOKEN || "";
}

function key() {
  const secret = process.env.LEADS_KEY || process.env.SESSION_SECRET || "";
  if (!secret) throw new Error("missing key");
  return crypto.scryptSync(secret, "mahakal-leads-v1", 32);
}

function encrypt(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, body]).toString("base64");
}

function decrypt(base64) {
  const raw = Buffer.from(String(base64).replace(/\s+/g, ""), "base64");
  if (raw.length < 29) throw new Error("short payload");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const body = raw.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
}

async function gh(pathname, options) {
  const opts = options || {};
  return fetch(API + pathname, {
    method: opts.method || "GET",
    headers: {
      Authorization: "Bearer " + token(),
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "mahakal-site-console",
      "Content-Type": "application/json"
    },
    body: opts.body
  });
}

async function ensureBranch() {
  const existing = await gh("/repos/" + REPO + "/git/ref/heads/" + BRANCH);
  if (existing.ok) return true;
  if (existing.status !== 404) return false;
  const main = await gh("/repos/" + REPO + "/git/ref/heads/main");
  if (!main.ok) return false;
  const data = await main.json();
  const created = await gh("/repos/" + REPO + "/git/refs", {
    method: "POST",
    body: JSON.stringify({ ref: "refs/heads/" + BRANCH, sha: data.object.sha })
  });
  return created.ok || created.status === 422;
}

async function readFile() {
  const res = await gh("/repos/" + REPO + "/contents/" + FILE + "?ref=" + BRANCH);
  if (res.status === 404) return { leads: [], sha: null };
  if (!res.ok) throw new Error("read failed: " + res.status);
  const body = await res.json();
  const text = Buffer.from(body.content || "", "base64").toString("utf8");
  let parsed = {};
  try {
    parsed = JSON.parse(decrypt(text) || "{}");
  } catch (error) {
    /* Wrong key or unreadable payload: start from an empty inbox rather than failing hard. */
    return { leads: [], sha: body.sha };
  }
  return { leads: Array.isArray(parsed.leads) ? parsed.leads : [], sha: body.sha };
}

async function writeFile(leads, sha, message) {
  const payload = {
    message: message,
    branch: BRANCH,
    content: Buffer.from(
      encrypt(JSON.stringify({ updatedAt: new Date().toISOString(), leads: leads }))
    ).toString("base64")
  };
  if (sha) payload.sha = sha;
  return gh("/repos/" + REPO + "/contents/" + FILE, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

async function listLeads() {
  await ensureBranch();
  const data = await readFile();
  return data.leads.slice().sort(function (a, b) {
    return String(b.createdAt).localeCompare(String(a.createdAt));
  });
}

async function mutate(mutator, message) {
  await ensureBranch();
  for (let attempt = 0; attempt < 3; attempt++) {
    const data = await readFile();
    const next = mutator(data.leads.slice());
    if (!next) return null;
    const trimmed = next.length > MAX_LEADS ? next.slice(0, MAX_LEADS) : next;
    const res = await writeFile(trimmed, data.sha, message);
    if (res.ok) return trimmed;
    if (res.status !== 409 && res.status !== 422) throw new Error("write failed: " + res.status);
  }
  throw new Error("write conflict");
}

/* Commit messages must stay free of personal data: the branch is public. */
async function addLead(lead) {
  return mutate(function (leads) {
    leads.unshift(lead);
    return leads;
  }, "lead: new enquiry");
}

async function updateLead(id, status) {
  return mutate(function (leads) {
    const index = leads.findIndex(function (item) { return item.id === id; });
    if (index < 0) return null;
    leads[index].status = status;
    leads[index].updatedAt = new Date().toISOString();
    return leads;
  }, "lead: status " + status);
}

async function deleteLead(id) {
  return mutate(function (leads) {
    const index = leads.findIndex(function (item) { return item.id === id; });
    if (index < 0) return null;
    leads.splice(index, 1);
    return leads;
  }, "lead: removed");
}

module.exports = { listLeads, addLead, updateLead, deleteLead };
