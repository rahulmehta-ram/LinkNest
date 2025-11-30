const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, 'data.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Initialize table with MVP fields + templates
db.run(`CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  edit_token TEXT NOT NULL,
  name TEXT,
  bio TEXT,
  photo TEXT,
  data TEXT,
  theme TEXT DEFAULT 'dark',
  bgColor TEXT DEFAULT '#1a1a1a',
  buttonColor TEXT DEFAULT '#3b82f6',
  template TEXT DEFAULT 'minimal',
  slug TEXT UNIQUE,
  views INTEGER DEFAULT 0,
  customization TEXT,
  created_at INTEGER
)`, (err) => {
  if (err) {
    console.error('Error creating table:', err.message);
  }
});

// Backfill / migrate existing DB: add missing columns if they don't exist
const migrations = [
  "ALTER TABLE profiles ADD COLUMN slug TEXT UNIQUE;",
  "ALTER TABLE profiles ADD COLUMN views INTEGER DEFAULT 0;",
  "ALTER TABLE profiles ADD COLUMN customization TEXT;"
];

migrations.forEach(sql => {
  db.run(sql, [], (err) => {
    // ignore errors (column may already exist)
  });
});

module.exports = db;
