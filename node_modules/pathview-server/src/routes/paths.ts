import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { join } from 'path';
import { fileURLToPath } from 'url';
import db from '../db.js';
import { parseCsv } from '../services/csvParser.js';
import { autoMatchColumns } from '../services/columnMatcher.js';
import type { Path, PathPoint, CreatePathRequest } from '../types/index.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const router = Router();
const upload = multer({ dest: join(__dirname, '..', '..', '..', 'uploads') });

// GET /api/paths - list all paths
router.get('/', (_req, res) => {
  const stmt = db.prepare('SELECT * FROM paths ORDER BY created_at DESC');
  const rows = stmt.all() as any[];
  const paths: Path[] = rows.map((r) => ({
    ...r,
    has_orientation: !!r.has_orientation,
  }));
  res.json(paths);
});

// GET /api/paths/:id - get path with points
router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  const pathRow = db.prepare('SELECT * FROM paths WHERE id = ?').get(id) as any;
  if (!pathRow) return res.status(404).json({ error: 'Path not found' });

  const points = db.prepare('SELECT * FROM path_points WHERE path_id = ? ORDER BY seq').all(id) as any[];
  const path: Path = {
    ...pathRow,
    has_orientation: !!pathRow.has_orientation,
  };
  const pathPoints: PathPoint[] = points.map((p) => ({
    ...p,
    extra: p.extra ? JSON.parse(p.extra) : null,
  }));
  res.json({ ...path, points: pathPoints });
});

// POST /api/paths - create path from points
router.post('/', (req, res) => {
  const body = req.body as CreatePathRequest;
  const { name, source_file, points } = body;
  if (!name || !points || points.length === 0) {
    return res.status(400).json({ error: 'name and points are required' });
  }

  const hasOrientation = points.some((p) => p.rx !== undefined || p.ry !== undefined || p.rz !== undefined);
  const insertPath = db.prepare(`
    INSERT INTO paths (name, source_file, has_orientation, point_count, color)
    VALUES (?, ?, ?, ?, ?)
  `);
  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
  const result = insertPath.run(name, source_file || null, hasOrientation ? 1 : 0, points.length, colors[Math.floor(Math.random() * colors.length)]);
  const pathId = Number(result.lastInsertRowid);

  const insertPoint = db.prepare(`
    INSERT INTO path_points (path_id, seq, x, y, z, rx, ry, rz, extra)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((pts) => {
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const extra: Record<string, number | string> = {};
      for (const [k, v] of Object.entries(p)) {
        if (!['x', 'y', 'z', 'rx', 'ry', 'rz'].includes(k) && v !== undefined) {
          if (v !== undefined && v !== null) extra[k] = v as number | string;
        }
      }
      insertPoint.run(
        pathId,
        i,
        p.x,
        p.y,
        p.z,
        p.rx ?? null,
        p.ry ?? null,
        p.rz ?? null,
        Object.keys(extra).length > 0 ? JSON.stringify(extra) : null
      );
    }
  });

  insertMany(points);
  res.status(201).json({ id: pathId });
});

// DELETE /api/paths/:id
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM paths WHERE id = ?').run(id);
  res.status(204).send();
});

// POST /api/paths/upload - upload and parse CSV
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const buffer = require('fs').readFileSync(req.file.path);
    const { columns, rows } = parseCsv(buffer);
    const mapping = autoMatchColumns(columns);
    res.json({ columns, rowCount: rows.length, mapping, fileName: req.file.originalname });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

export default router;
