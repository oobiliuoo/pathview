import { Router } from 'express';
import multer from 'multer';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, unlinkSync, mkdirSync } from 'fs';
import db from '../db.js';
import { parseCsv, parseCsvRaw, detectHeader } from '../services/csvParser.js';
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
    const rawRows = parseCsvRaw(buffer);
    if (rawRows.length === 0) {
      unlinkSync(req.file.path);
      return res.status(400).json({ error: 'CSV file has no data rows' });
    }
    const rawPreview = rawRows.slice(0, 5);
    const detectedHeader = rawPreview.length > 0 ? detectHeader(rawPreview[0]) : true;
    const headerRow = detectedHeader ? 0 : -1;
    const { columns, rows, totalColumns } = parseCsv(buffer, headerRow);
    const mapping = autoMatchColumns(columns);
    res.json({
      fileId: req.file.filename,
      columns,
      rows,
      rowCount: rows.length,
      mapping,
      fileName: req.file.originalname,
      hasHeader: detectedHeader,
      rawPreview,
      totalColumns,
    });
  } catch (err) {
    try { if (req.file) unlinkSync(req.file.path); } catch {}
    res.status(400).json({ error: (err as Error).message });
  }
});

// POST /api/paths/reparse - re-parse uploaded CSV with different header row
router.post('/reparse', (req, res) => {
  const { fileId, headerRow } = req.body;
  if (!fileId || headerRow === undefined) return res.status(400).json({ error: 'fileId and headerRow are required' });
  const filePath = join(uploadsDir, fileId);
  try {
    const buffer = readFileSync(filePath);
    const rawRows = parseCsvRaw(buffer);
    if (rawRows.length === 0) return res.status(400).json({ error: 'CSV file has no data rows' });
    const rawPreview = rawRows.slice(0, 5);
    const { columns, rows, totalColumns } = parseCsv(buffer, headerRow);
    const mapping = autoMatchColumns(columns);
    res.json({ columns, rows, rowCount: rows.length, mapping, rawPreview, totalColumns });
  } catch (err) {
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
  const colors = ['#3b82f6', '#f59e0b', '#22c55e', '#ef4444', '#a855f7', '#ec4899', '#06b6d4', '#f97316'];
  const existingCount = (db.prepare('SELECT COUNT(*) as c FROM paths').get() as any).c;
  const color = colors[existingCount % colors.length];

  const insertPath = db.prepare(`
    INSERT INTO paths (name, source_file, has_orientation, point_count, color)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertPoint = db.prepare(`
    INSERT INTO path_points (path_id, seq, x, y, z, rx, ry, rz, extra)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const createAll = db.transaction(() => {
    const result = insertPath.run(name, source_file || null, hasOrientation ? 1 : 0, points.length, color);
    const pathId = Number(result.lastInsertRowid);

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
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
    return pathId;
  });

  try {
    const pathId = createAll();
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

// PATCH /api/paths/:id/name - update path name
router.patch('/:id/name', (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid path id' });
  const { name } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'name is required' });
  }
  const result = db.prepare('UPDATE paths SET name = ? WHERE id = ?').run(name.trim(), id);
  if (result.changes === 0) return res.status(404).json({ error: 'Path not found' });
  res.json({ id, name: name.trim() });
});

// PATCH /api/paths/:id/color - update path color
router.patch('/:id/color', (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid path id' });
  const { color } = req.body;
  if (!color || typeof color !== 'string') return res.status(400).json({ error: 'color is required' });
  const result = db.prepare('UPDATE paths SET color = ? WHERE id = ?').run(color, id);
  if (result.changes === 0) return res.status(404).json({ error: 'Path not found' });
  res.json({ id, color });
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