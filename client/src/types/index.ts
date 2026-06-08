export interface Path {
  id: number;
  name: string;
  source_file: string | null;
  has_orientation: boolean;
  point_count: number;
  color: string;
  created_at: string;
}

export interface PathPoint {
  id: number;
  path_id: number;
  seq: number;
  x: number;
  y: number;
  z: number;
  rx: number | null;
  ry: number | null;
  rz: number | null;
  extra: Record<string, number | string> | null;
}

export interface PathWithPoints extends Path {
  points: PathPoint[];
}

export interface ColumnMapping {
  x: string;
  y: string;
  z: string;
  rx?: string;
  ry?: string;
  rz?: string;
}

export interface CsvUploadResult {
  fileId: string;
  columns: string[];
  rows: Record<string, string>[];
  rowCount: number;
  mapping: Partial<ColumnMapping>;
  fileName: string;
  hasHeader: boolean;
  rawPreview: string[][];
  totalColumns: number;
}

export interface CsvReparseResult {
  columns: string[];
  rows: Record<string, string>[];
  rowCount: number;
  mapping: Partial<ColumnMapping>;
  rawPreview: string[][];
  totalColumns: number;
}

export type PlaybackMode = 'point' | 'smooth' | 'loop';
