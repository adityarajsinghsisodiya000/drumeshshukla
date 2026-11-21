"use strict";
/* /api/leads
   POST   public  : create an appointment enquiry
   GET    private : list enquiries
   PATCH  private : { id, status }
   DELETE private : { id }                                   */
const crypto = require("node:crypto");
const { isAuthed } = require("./_lib/session");
const store = require("./_lib/store");

const STATUSES = ["new", "contacted", "booked", "closed"];
const rate = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 5;

function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch (e) {
      return {};
    }
  }
  return {};
}

function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded) return forwarded.split(",")[0].trim();
  return req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : "unknown";
}

function rateLimited(ip) {
  const now = Date.now();
  const entry = rate.get(ip) || { count: 0, start: now };
  if (now - entry.start > WINDOW_MS) {
    entry.count = 0;
    entry.start = now;
  }
  entry.count += 1;
  rate.set(ip, entry);
  return entry.count > MAX_PER_WINDOW;
}

function clean(value, max) {
  return String(value == null ? "" : value).trim().slice(0, max);
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const host = new URL(origin).host;
    const target = req.headers["x-forwarded-host"] || req.headers.host;
    return host === target;
  } catch (e) {
    return false;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "POST") {
    if (!sameOrigin(req)) {
      res.status(403).json({ error: "bad_origin" });
      return;
    }
    const ip = clientIp(req);
    if (rateLimited(ip)) {
      res.status(429).json({ error: "too_many_requests" });
      return;
    }

    const body = readBody(req);
    if (body.company) {
      res.status(200).json({ ok: true });
      return;
    }

    const name = clean(body.name, 80);
    const phone = clean(body.phone, 20).replace(/[^\d+\s-]/g, "");
    const condition = clean(body.condition, 80);
    const city = clean(body.city, 80);
    const time = clean(body.time, 40);
    const message = clean(body.message, 600);
    const page = clean(body.page, 120);

    if (name.length < 2 || phone.replace(/\D/g, "").length < 10 || !condition) {
      res.status(400).json({ error: "invalid_request" });
      return;
    }

    const lead = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      status: "new",
      name: name,
      phone: phone,
      condition: condition,
      city: city,
      time: time,
      message: message,
      page: page
    };

    try {
      await store.addLead(lead);
      res.status(201).json({ ok: true, id: lead.id });
    } catch (error) {
      res.status(500).json({ error: "store_failed" });
    }
    return;
  }

  if (!isAuthed(req)) {
    res.status(401).json({ error: "unauthorised" });
    return;
  }

  if (req.method === "GET") {
    try {
      const leads = await store.listLeads();
      res.status(200).json({ ok: true, leads: leads });
    } catch (error) {
      res.status(500).json({ error: "read_failed" });
    }
    return;
  }

  if (req.method === "PATCH") {
    if (!sameOrigin(req)) {
      res.status(403).json({ error: "bad_origin" });
      return;
    }
    const body = readBody(req);
    const id = clean(body.id, 60);
    const status = clean(body.status, 20);
    if (!id || STATUSES.indexOf(status) < 0) {
      res.status(400).json({ error: "invalid_request" });
      return;
    }
    try {
      const leads = await store.updateLead(id, status);
      if (!leads) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      res.status(200).json({ ok: true, leads: leads });
    } catch (error) {
      res.status(500).json({ error: "update_failed" });
    }
    return;
  }

  if (req.method === "DELETE") {
    if (!sameOrigin(req)) {
      res.status(403).json({ error: "bad_origin" });
      return;
    }
    const body = readBody(req);
    const id = clean(body.id, 60);
    if (!id) {
      res.status(400).json({ error: "invalid_request" });
      return;
    }
    try {
      const leads = await store.deleteLead(id);
      if (!leads) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      res.status(200).json({ ok: true, leads: leads });
    } catch (error) {
      res.status(500).json({ error: "delete_failed" });
    }
    return;
  }

  res.setHeader("Allow", "GET, POST, PATCH, DELETE");
  res.status(405).json({ error: "method_not_allowed" });
};
