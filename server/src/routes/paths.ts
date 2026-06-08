import { Router } from 'express';
import multer from 'multer';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, unlinkSync, mkdirSync } from 'fs';
import db from '../db.js';
import { parseCsv } from '../services/csvParser.js';
import { autoMatchColumns } from '../services/columnMatcher.js';
import type { Path, PathPoint, CreatePathRequest } from '../types/index.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const uploadsDir = join(__dirname, '..', '..', '..', 'uploads');
mkdirSync(uploadsDir, { recursive: true });

const router = Router();
const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 50 * 1024 * 1024 },
});

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

// POST /api/paths/upload - MUST be before /:id to avoid route collision
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const buffer = readFileSync(req.file.path);
    const { columns, rows } = parseCsv(buffer);
    if (rows.length === 0) {
      unlinkSync(req.file.path);
      return res.status(400).json({ error: 'CSV file has no data rows' });
    }
    const mapping = autoMatchColumns(columns);
    if (!mapping.x || !mapping.y || !mapping.z) {
      unlinkSync(req.file.path);
      return res.status(400).json({
        error: 'Could not auto-detect position columns (X/Y/Z). Please check your CSV.',
        columns,
        rowCount: rows.length,
        mapping,
      });
    }
    res.json({
      fileId: req.file.filename,
      columns,
      rows,
      rowCount: rows.length,
      mapping,
      fileName: req.file.originalname,
    });
  } catch (err) {
    try { if (req.file) unlinkSync(req.file.path); } catch {}
    res.status(400).json({ error: (err as Error).message });
  }
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
  const colors = ['#3b82f6', '#f59e0b', '#22c55e', '#ef4444', '#a855f7', '#ec4899', '#06b6d4', '#f97316'];
  const existingCount = (db.prepare('SELECT COUNT(*) as c FROM paths').get() as any).c;
  const color = colors[existingCount % colors.length];
  const result = insertPath.run(name, source_file || null, hasOrientation ? 1 : 0, points.length, color);
  const pathId = Number(result.lastInsertRowid);

  const insertPoint = db.prepare(`
    INSERT INTO path_points (path_id, seq, x, y, z, rx, ry, rz, extra)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((pts: any[]) => {
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const extra: Record<string, number | string> = {};
      for (const [k, v] of Object.entries(p)) {
        if (!['x', 'y', 'z', 'rx', 'ry', 'rz'].includes(k) && v !== undefined && v !== null) {
          extra[k] = v as number | string;
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

  try {
    insertMany(points);
    res.status(201).json({ id: pathId });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/paths/:id - get path with points
router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid path id' });
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

// DELETE /api/paths/:id
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid path id' });
  const result = db.prepare('DELETE FROM paths WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Path not found' });
  res.status(204).send();
});

export default router;