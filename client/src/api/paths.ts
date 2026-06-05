import type { Path, PathWithPoints, CsvUploadResult, ColumnMapping } from '../types/index.js';

const API_BASE = 'http://localhost:3001/api';

export async function fetchPaths(): Promise<Path[]> {
  const res = await fetch(`${API_BASE}/paths`);
  if (!res.ok) throw new Error('Failed to fetch paths');
  return res.json();
}

export async function fetchPathWithPoints(id: number): Promise<PathWithPoints> {
  const res = await fetch(`${API_BASE}/paths/${id}`);
  if (!res.ok) throw new Error('Failed to fetch path');
  return res.json();
}

export async function createPath(name: string, sourceFile: string | null, points: any[]): Promise<{ id: number }> {
  const res = await fetch(`${API_BASE}/paths`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, source_file: sourceFile, points }),
  });
  if (!res.ok) throw new Error('Failed to create path');
  return res.json();
}

export async function deletePath(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/paths/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete path');
}

export async function uploadCsv(file: File): Promise<CsvUploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/paths/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to upload CSV');
  return res.json();
}
