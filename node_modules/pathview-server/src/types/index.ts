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

export interface CreatePathRequest {
  name: string;
  source_file?: string;
  points: Array<{
    x: number;
    y: number;
    z: number;
    rx?: number;
    ry?: number;
    rz?: number;
    [key: string]: number | string | undefined;
  }>;
}
