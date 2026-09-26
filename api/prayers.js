// /api/prayers
//
// The site's one write-capable endpoint. A visitor on pray.html can pick a
// verse from the curated 12-verse list, optionally add a name and a
// message, and submit; this stores that entry. The GET response's length
// IS the real, shared prayer count, there is no separate counter to keep
// in sync.
//
// Adapted from sriharsh-2003/Father-Charity-Site's /api/prayers.js.
//
// STORAGE: Upstash Redis via Vercel Marketplace. Vercel's own KV product
// was retired and folded into the Marketplace in Dec 2024, Upstash is the
// direct successor. The Marketplace integration names its env vars
// KV_REST_API_URL / KV_REST_API_TOKEN (it also provides REDIS_URL, which
// this code does not use, the REST API is simpler for serverless). This
// file checks a couple of possible names so it works whether you're using
// the Marketplace's default naming or renamed them yourself:
//   KV_REST_API_URL / KV_REST_API_TOKEN        (Vercel Marketplace default)
//   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN  (manual Upstash setup)
//
// Also set, by hand, in Vercel's Environment Variables:
//   ADMIN_TOKEN   (a long random secret; not wired to any admin UI yet in
//   this repo, reserved for a moderation view later)
//
// DATA SHAPE: one JSON string per prayer in a single Redis list:
//   { id, name, verse, message, createdAt }
//   name and message are optional. verse is one of the 12 curated keys
//   from js/pray.js's QURAN_VERSES (e.g. "14:41").
//
// GET ?feed=1&limit=15 returns a privacy-safe subset for public display:
// only entries with a message, name always stripped server-side (never
// sent over the wire in this mode), newest first, capped at `limit`.
// Plain GET (no query) is unchanged and returns everything, name included -
// kept for a future admin/moderation view, not used by the public site.

import crypto from "node:crypto";

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

const LIST_KEY = "prayers:list";
const MAX_ENTRIES = 2000;         // oldest entries fall off past this
const MAX_MESSAGE_LENGTH = 500;
const MAX_NAME_LENGTH = 80;
const MAX_VERSE_LENGTH = 20;
const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_PER_WINDOW = 5;
const DEDUPE_WINDOW_SECONDS = 30; // guards against double-tap/double-submit, not repeat prayer over time

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

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

function hash(value) {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 16);
}

export default async function handler(req, res) {
  if (!REDIS_URL || !REDIS_TOKEN) {
    res.status(500).json({ error: "Storage is not configured yet. Check KV_REST_API_URL / KV_REST_API_TOKEN in Vercel." });
    return;
  }

  if (req.method === "GET") {
    try {
      const isFeed = req.query && (req.query.feed === "1" || req.query.feed === "true");

      if (isFeed) {
        // Public display feed for the site: only entries that actually have
        // a message (a bare "I prayed" with no words isn't a "testimony" to
        // show), name always stripped regardless of what was submitted -
        // this is enforced here, not left to the frontend to hide, so the
        // network response itself never carries a name for this mode.
        const limit = Math.min(parseInt((req.query && req.query.limit) || "15", 10) || 15, 50);
        const raw = await redis(["LRANGE", LIST_KEY, "0", String(Math.max(limit * 5, 150) - 1)]);
        const feed = (raw || [])
          .map((item) => { try { return JSON.parse(item); } catch { return null; } })
          .filter((p) => p && typeof p.message === "string" && p.message.length > 0)
          .slice(0, limit)
          .map((p) => ({ verse: p.verse, message: p.message, createdAt: p.createdAt }));
        res.status(200).json({ prayers: feed, count: feed.length });
        return;
      }

      const raw = await redis(["LRANGE", LIST_KEY, "0", "-1"]);
      const prayers = (raw || []).map((item) => JSON.parse(item));
      res.status(200).json({ prayers, count: prayers.length });
    } catch (err) {
      res.status(500).json({ error: "Could not load prayers." });
    }
    return;
  }

  if (req.method === "POST") {
    const ip = getClientIp(req);

    try {
      const rateKey = `ratelimit:prayers:${ip}`;
      const count = await redis(["INCR", rateKey]);
      if (count === 1) await redis(["EXPIRE", rateKey, String(RATE_LIMIT_WINDOW_SECONDS)]);
      if (count > RATE_LIMIT_MAX_PER_WINDOW) {
        res.status(429).json({ error: "Too many submissions. Please wait a moment and try again." });
        return;
      }
    } catch (err) {
      res.status(500).json({ error: "Could not process submission right now." });
      return;
    }

    const body = req.body || {};
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const verse = typeof body.verse === "string" ? body.verse.trim() : "";

    const cleanMessage = message.slice(0, MAX_MESSAGE_LENGTH);
    const cleanName = name.slice(0, MAX_NAME_LENGTH);
    const cleanVerse = verse.slice(0, MAX_VERSE_LENGTH);

    try {
      // Guards against a double-tap or double form submit, not against
      // someone genuinely praying again later, that's allowed and expected.
      const dedupeKey = `dedupe:prayers:${ip}:${hash(cleanMessage + cleanVerse)}`;
      const seen = await redis(["GET", dedupeKey]);
      if (seen) {
        res.status(409).json({ error: "This looks like a duplicate submission." });
        return;
      }
      await redis(["SET", dedupeKey, "1", "EX", String(DEDUPE_WINDOW_SECONDS)]);

      const entry = {
        id: crypto.randomUUID(),
        name: cleanName || null,
        verse: cleanVerse || null,
        message: cleanMessage || null,
        createdAt: new Date().toISOString(),
      };

      await redis(["LPUSH", LIST_KEY, JSON.stringify(entry)]);
      await redis(["LTRIM", LIST_KEY, "0", String(MAX_ENTRIES - 1)]);

      res.status(201).json({ prayer: entry });
    } catch (err) {
      res.status(500).json({ error: "Could not save the prayer." });
    }
    return;
  }

  if (req.method === "DELETE") {
    const token = req.headers["x-admin-token"];
    if (!ADMIN_TOKEN || !token || token !== ADMIN_TOKEN) {
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
        try {
          return JSON.parse(item).id === id;
        } catch {
          return false;
        }
      });
      if (!match) {
        res.status(404).json({ error: "Not found." });
        return;
      }
      await redis(["LREM", LIST_KEY, "1", match]);
      res.status(200).json({ deleted: id });
    } catch (err) {
      res.status(500).json({ error: "Could not delete the prayer." });
    }
    return;
  }

  res.status(405).json({ error: "Method not allowed." });
}
