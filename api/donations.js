// /api/donations
//
// Data collection only - this does NOT process payments. There is still no
// licensed payment gateway wired up on this site (see the "Bank details"
// card on donate.html, which itself says the transfer details are pending
// approval). What this endpoint does is record a visitor's donation
// *intent* - the amount they mean to give, plus name/email if they choose
// to share them - so the family can follow up and reconcile it against the
// actual bank transfer once it comes in. The frontend (js/donate.js) must
// never tell a visitor their payment succeeded; only that the request was
// recorded.
//
// Same storage as /api/prayers (see that file's header for the full
// Upstash Redis / env var explanation) - just a different Redis key, so no
// extra setup is needed beyond what prayers already requires.
//
// DATA SHAPE: one JSON string per entry in a single Redis list:
//   { id, name, email, amount, currency, createdAt }
//   name and email are optional. amount is a positive number. currency is
//   always "SAR" for now (the only option offered on the form).

import crypto from "node:crypto";

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

const LIST_KEY = "donations:list";
const MAX_ENTRIES = 5000;
const MAX_NAME_LENGTH = 80;
const MAX_EMAIL_LENGTH = 120;
const MIN_AMOUNT = 1;
const MAX_AMOUNT = 10_000_000; // sanity cap against garbage/attack input, not a real donation limit
const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_PER_WINDOW = 5;
const DEDUPE_WINDOW_SECONDS = 30; // guards against double-tap/double submit, not a second real pledge later

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
      const raw = await redis(["LRANGE", LIST_KEY, "0", "-1"]);
      const donations = (raw || []).map((item) => JSON.parse(item));
      const total = donations.reduce((sum, d) => sum + (typeof d.amount === "number" ? d.amount : 0), 0);
      res.status(200).json({ donations, count: donations.length, total });
    } catch (err) {
      res.status(500).json({ error: "Could not load donations." });
    }
    return;
  }

  if (req.method === "POST") {
    const ip = getClientIp(req);

    try {
      const rateKey = `ratelimit:donations:${ip}`;
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
    const amount = typeof body.amount === "number" ? body.amount : parseFloat(body.amount);
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";

    if (!Number.isFinite(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
      res.status(400).json({ error: "Invalid amount." });
      return;
    }
    if (email && (!EMAIL_RE.test(email) || email.length > MAX_EMAIL_LENGTH)) {
      res.status(400).json({ error: "Invalid email." });
      return;
    }

    const cleanName = name.slice(0, MAX_NAME_LENGTH);
    const cleanEmail = email.slice(0, MAX_EMAIL_LENGTH);
    const roundedAmount = Math.round(amount * 100) / 100;

    try {
      // Guards against a double-tap or double form submit, not against
      // someone genuinely pledging again later, that's allowed and expected.
      const dedupeKey = `dedupe:donations:${ip}:${hash(cleanEmail + roundedAmount)}`;
      const seen = await redis(["GET", dedupeKey]);
      if (seen) {
        res.status(409).json({ error: "This looks like a duplicate submission." });
        return;
      }
      await redis(["SET", dedupeKey, "1", "EX", String(DEDUPE_WINDOW_SECONDS)]);

      const entry = {
        id: crypto.randomUUID(),
        name: cleanName || null,
        email: cleanEmail || null,
        amount: roundedAmount,
        currency: "SAR",
        createdAt: new Date().toISOString(),
      };

      await redis(["LPUSH", LIST_KEY, JSON.stringify(entry)]);
      await redis(["LTRIM", LIST_KEY, "0", String(MAX_ENTRIES - 1)]);

      res.status(201).json({ donation: entry });
    } catch (err) {
      res.status(500).json({ error: "Could not save the donation request." });
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
      res.status(500).json({ error: "Could not delete the donation." });
    }
    return;
  }

  res.status(405).json({ error: "Method not allowed." });
}
