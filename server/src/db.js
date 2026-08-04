const Database = require('better-sqlite3');
const path = require('node:path');
const fs = require('node:fs');

const dbDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const isTestEnvironment = process.env.NODE_ENV === 'test';
const dbFileName = isTestEnvironment ? 'raj-digital-library.test.sqlite' : 'raj-digital-library.sqlite';
const dbPath = path.join(dbDir, dbFileName);

if (isTestEnvironment) {
  for (const candidate of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
    if (fs.existsSync(candidate)) {
      fs.rmSync(candidate, { force: true });
    }
  }
}

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    mobile_number TEXT NOT NULL,
    joining_date TEXT NOT NULL,
    membership_plan TEXT NOT NULL,
    membership_start_date TEXT NOT NULL,
    membership_expiry_date TEXT NOT NULL,
    assigned_seat TEXT,
    status TEXT NOT NULL,
    monthly_duration INTEGER DEFAULT 1
  );
`);

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS renewals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      previous_expiry_date TEXT NOT NULL,
      renewal_expiry_date TEXT NOT NULL,
      new_expiry_date TEXT NOT NULL,
      membership_plan TEXT NOT NULL,
      renewal_date TEXT NOT NULL,
      notes TEXT,
      FOREIGN KEY(member_id) REFERENCES members(id) ON DELETE CASCADE
    );
  `);
} catch (error) {
  if (!String(error.message).includes('already exists')) {
    throw error;
  }
}

for (const [columnName, definition] of [
  ['renewal_expiry_date', 'TEXT'],
  ['new_expiry_date', 'TEXT'],
  ['monthly_duration', 'INTEGER DEFAULT 1'],
]) {
  try {
    db.exec(`ALTER TABLE ${columnName === 'monthly_duration' ? 'members' : 'renewals'} ADD COLUMN ${columnName} ${definition}`);
  } catch (error) {
    if (!String(error.message).includes('duplicate column name')) {
      throw error;
    }
  }
}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      membership_plan TEXT,
      membership_start_date TEXT,
      membership_expiry_date TEXT,
      assigned_seat TEXT,
      amount REAL NOT NULL,
      payment_date TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      receipt_number TEXT NOT NULL,
      notes TEXT,
      created_at TEXT,
      FOREIGN KEY(member_id) REFERENCES members(id) ON DELETE CASCADE
    );
  `);
} catch (error) {
  if (!String(error.message).includes('already exists')) {
    throw error;
  }
}

for (const [columnName, definition] of [
  ['membership_plan', 'TEXT'],
  ['membership_start_date', 'TEXT'],
  ['membership_expiry_date', 'TEXT'],
  ['assigned_seat', 'TEXT'],
  ['created_at', 'TEXT'],
]) {
  try {
    db.exec(`ALTER TABLE payments ADD COLUMN ${columnName} ${definition}`);
  } catch (error) {
    if (!String(error.message).includes('duplicate column name')) {
      throw error;
    }
  }
}

module.exports = db;
