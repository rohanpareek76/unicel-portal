const path = require("path");
const Database = require("better-sqlite3");

const dbPath = path.join(__dirname, "..", "data.sqlite");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ---------- Schema ----------
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('founder','director','hoi')),
  title TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS loan_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  applicant_name TEXT NOT NULL,
  village TEXT NOT NULL,
  purpose TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'SUBMITTED',
  -- SUBMITTED -> DIRECTOR_REVIEW -> FOUNDER_REVIEW -> DISBURSED
  --           \\-> REJECTED (at any stage)
  hoi_id INTEGER,
  hoi_remarks TEXT,
  hoi_decided_at TEXT,
  director_id INTEGER,
  director_remarks TEXT,
  director_decided_at TEXT,
  founder_id INTEGER,
  founder_remarks TEXT,
  founder_decided_at TEXT,
  created_by INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (hoi_id) REFERENCES users(id),
  FOREIGN KEY (director_id) REFERENCES users(id),
  FOREIGN KEY (founder_id) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);
`);

module.exports = db;
