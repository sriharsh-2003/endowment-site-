import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import express from 'express';

const PORT = Number(process.env.API_PORT || 3001);
const CLIENT_EMAIL = process.env.CLIENT_EMAIL || 'test@gmail.com';
const CLIENT_PASSWORD = process.env.CLIENT_PASSWORD || 'test@123';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const databasePath = process.env.SQLITE_PATH || './data/endowment.sqlite';
fs.mkdirSync(path.dirname(path.resolve(databasePath)), {recursive: true});
const db = new Database(databasePath);
const sessions = new Map();

db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS donations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    donor_name TEXT NOT NULL,
    donor_email TEXT NOT NULL,
    amount REAL NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'SAR',
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS bank_details (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    bank_name TEXT NOT NULL,
    beneficiary_name TEXT NOT NULL,
    iban TEXT NOT NULL,
    account_number TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

db.prepare(`
  INSERT OR IGNORE INTO bank_details (id, bank_name, beneficiary_name, iban, account_number)
  VALUES (1, 'مصرف الراجحي', 'وقف عبدالله محمد العجلان الخيري', 'SAXXXXXXXXXXXXXXXXXXXX', 'XXXXXXXXXXXXXXXX')
`).run();

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function createSession() {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, {email: CLIENT_EMAIL, expiresAt: Date.now() + SESSION_TTL_MS});
  return token;
}

function requireSession(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.client_session;
  const session = token && sessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    if (token) sessions.delete(token);
    return res.status(401).json({error: 'Authentication required'});
  }
  req.session = session;
  req.sessionToken = token;
  next();
}

const app = express();
app.use(express.json({limit: '32kb'}));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  res.setHeader('Cache-Control', 'no-store');
  next();
});

app.post('/api/auth/login', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (email !== CLIENT_EMAIL.toLowerCase() || hashPassword(password) !== hashPassword(CLIENT_PASSWORD)) {
    return res.status(401).json({error: 'Invalid email or password'});
  }
  const token = createSession();
  res.json({token, email: CLIENT_EMAIL});
});

app.post('/api/auth/logout', requireSession, (req, res) => {
  sessions.delete(req.sessionToken);
  res.status(204).end();
});

app.post('/api/donations', (req, res) => {
  const donorName = String(req.body?.name || '').trim();
  const donorEmail = String(req.body?.email || '').trim();
  const amount = Number(req.body?.amount);
  if (!donorName || !donorEmail || !Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({error: 'Name, email, and a positive amount are required'});
  }
  const result = db.prepare(`
    INSERT INTO donations (donor_name, donor_email, amount)
    VALUES (?, ?, ?)
  `).run(donorName, donorEmail, amount);
  res.status(201).json({id: result.lastInsertRowid, status: 'pending'});
});

app.get('/api/bank-details', (req, res) => {
  res.json(db.prepare('SELECT bank_name, beneficiary_name, iban, account_number FROM bank_details WHERE id = 1').get());
});

app.get('/api/client/summary', requireSession, (req, res) => {
  const donations = db.prepare('SELECT * FROM donations ORDER BY created_at DESC, id DESC').all();
  const totals = db.prepare(`
    SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS amount
    FROM donations
    WHERE status != 'cancelled'
  `).get();
  const bank = db.prepare('SELECT * FROM bank_details WHERE id = 1').get();
  res.json({donations, totals, bank});
});

app.put('/api/client/bank-details', requireSession, (req, res) => {
  const values = ['bankName', 'beneficiaryName', 'iban', 'accountNumber']
    .map((key) => String(req.body?.[key] || '').trim());
  if (values.some((value) => !value)) {
    return res.status(400).json({error: 'All bank details are required'});
  }
  db.prepare(`
    UPDATE bank_details
    SET bank_name = ?, beneficiary_name = ?, iban = ?, account_number = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `).run(...values);
  res.json(db.prepare('SELECT * FROM bank_details WHERE id = 1').get());
});

app.listen(PORT, () => {
  console.log(`SQLite API listening on http://localhost:${PORT}`);
});
