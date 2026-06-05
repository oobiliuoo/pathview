import Database from 'better-sqlite3';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const db = new Database(join(__dirname, '..', '..', 'data', 'pathview.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS paths (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    source_file TEXT,
    has_orientation INTEGER DEFAULT 0,
    point_count INTEGER DEFAULT 0,
    color TEXT DEFAULT '#3b82f6',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS path_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path_id INTEGER NOT NULL,
    seq INTEGER NOT NULL,
    x REAL NOT NULL,
    y REAL NOT NULL,
    z REAL NOT NULL,
    rx REAL,
    ry REAL,
    rz REAL,
    extra TEXT,
    FOREIGN KEY (path_id) REFERENCES paths(id) ON DELETE CASCADE
  );
`);

export default db;
