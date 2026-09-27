// /api/visits
//
// Backs the homepage's "Suggested Visiting Times" section. Unlike
// /api/prayers and /api/donations, this is NOT open for public submission -
// only the family should be adding official visiting dates, so POST and
// DELETE both require the same ADMIN_TOKEN used elsewhere in this project
// (sent as an X-Admin-Token header). GET is public with no auth, since the
// whole point is for visitors to see the schedule.
//
// Same storage as /api/prayers and /api/donations (see prayers.js's header
// for the full Upstash Redis / env var explanation) - just a different
// Redis key, no extra setup needed.
//
// DATA SHAPE: one JSON string per entry in a single Redis list:
//   { id, date, titleAr, titleEn, descAr, descEn, createdAt }
//   date is a plain "YYYY-MM-DD" string (no time-of-day). The frontend
//   formats it into a localized day/month badge itself (js/visits.js),
//   rather than storing pre-formatted date strings that would need to be
//   kept in sync across two languages by hand.

import crypto from "node:crypto";

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

const LIST_KEY = "visits:list";
const MAX_ENTRIES = 500;
const MAX_TEXT_LENGTH = 200;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function redis(command) {
  const res = await fetch(REDIS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  if (!res.ok) {
    throw new Error(`Redis command failed: ${res.status}`);
  }
  const data = await res.json();
  return data.result;
}

function isAdmin(req) {
  const token = req.headers["x-admin-token"];
  return Boolean(ADMIN_TOKEN) && token === ADMIN_TOKEN;
}

function clean(value) {
  return typeof value === "string" ? value.trim().slice(0, MAX_TEXT_LENGTH) : "";
}

export default async function handler(req, res) {
  if (!REDIS_URL || !REDIS_TOKEN) {
    res.status(500).json({ error: "Storage is not configured yet. Check KV_REST_API_URL / KV_REST_API_TOKEN in Vercel." });
    return;
  }

  if (req.method === "GET") {
    try {
      const raw = await redis(["LRANGE", LIST_KEY, "0", "-1"]);
      const visits = (raw || [])
        .map((item) => { try { return JSON.parse(item); } catch { return null; } })
        .filter(Boolean)
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
      res.status(200).json({ visits, count: visits.length });
    } catch (err) {
      res.status(500).json({ error: "Could not load visiting dates." });
    }
    return;
  }

  if (req.method === "POST") {
    if (!isAdmin(req)) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const body = req.body || {};
    const date = typeof body.date === "string" ? body.date.trim() : "";
    if (!DATE_RE.test(date)) {
      res.status(400).json({ error: "Invalid date. Expected YYYY-MM-DD." });
      return;
    }
    const titleAr = clean(body.titleAr);
    const titleEn = clean(body.titleEn);
    if (!titleAr && !titleEn) {
      res.status(400).json({ error: "At least one of titleAr / titleEn is required." });
      return;
    }

    const entry = {
      id: crypto.randomUUID(),
      date,
      titleAr,
      titleEn,
      descAr: clean(body.descAr),
      descEn: clean(body.descEn),
      createdAt: new Date().toISOString(),
    };

    try {
      await redis(["LPUSH", LIST_KEY, JSON.stringify(entry)]);
      await redis(["LTRIM", LIST_KEY, "0", String(MAX_ENTRIES - 1)]);
      res.status(201).json({ visit: entry });
    } catch (err) {
      res.status(500).json({ error: "Could not save the visiting date." });
    }
    return;
  }

  if (req.method === "DELETE") {
    if (!isAdmin(req)) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const id = (req.query && req.query.id) || "";
    if (!id) {
      res.status(400).json({ error: "Missing id." });
      return;
    }

    try {
      const raw = await redis(["LRANGE", LIST_KEY, "0", "-1"]);
      const match = (raw || []).find((item) => {
        try { return JSON.parse(item).id === id; } catch { return false; }
      });
      if (!match) {
        res.status(404).json({ error: "Not found." });
        return;
      }
      await redis(["LREM", LIST_KEY, "1", match]);
      res.status(200).json({ deleted: id });
    } catch (err) {
      res.status(500).json({ error: "Could not delete the visiting date." });
    }
    return;
  }

  res.status(405).json({ error: "Method not allowed." });
}
