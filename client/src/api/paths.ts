import type { Path, PathWithPoints, CsvUploadResult, CsvReparseResult, ColumnMapping } from '../types/index.js';

const API_BASE = '/api/paths';

export async function fetchPaths(): Promise<Path[]> {
  const res = await fetch(API_BASE);
  if (!res.ok) throw new Error('Failed to fetch paths');
  return res.json();
}

export async function fetchPathWithPoints(id: number): Promise<PathWithPoints> {
  const res = await fetch(`${API_BASE}/${id}`);
  if (!res.ok) throw new Error('Failed to fetch path');
  return res.json();
}

export async function createPath(name: string, sourceFile: string | null, points: any[]): Promise<{ id: number }> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, source_file: sourceFile, points }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create path');
  }
  return res.json();
}

export async function deletePath(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete path');
}

export async function updatePathColor(id: number, color: string): Promise<{ id: number; color: string }> {
  const res = await fetch(`${API_BASE}/${id}/color`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ color }),
  });
  if (!res.ok) throw new Error('Failed to update path color');
  return res.json();
}

export async function uploadCsv(file: File): Promise<CsvUploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to upload CSV');
  }
  return res.json();
}

export async function reparseCsv(fileId: string, headerRow: number): Promise<CsvReparseResult> {
  const res = await fetch(`${API_BASE}/reparse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileId, headerRow }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to reparse CSV');
  }
  return res.json();
}