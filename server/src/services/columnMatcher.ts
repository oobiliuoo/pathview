export interface ColumnMapping {
  x: string;
  y: string;
  z: string;
  rx?: string;
  ry?: string;
  rz?: string;
}

const POSITION_ALIASES: Record<string, string[]> = {
  x: ['x', 'pos_x', 'position_x', 'px', 'x_pos', 'x_position'],
  y: ['y', 'pos_y', 'position_y', 'py', 'y_pos', 'y_position'],
  z: ['z', 'pos_z', 'position_z', 'pz', 'z_pos', 'z_position'],
};

const ROTATION_ALIASES: Record<string, string[]> = {
  rx: ['rx', 'rot_x', 'rotation_x', 'roll', 'r_x', 'x_rot'],
  ry: ['ry', 'rot_y', 'rotation_y', 'pitch', 'r_y', 'y_rot'],
  rz: ['rz', 'rot_z', 'rotation_z', 'yaw', 'r_z', 'z_rot'],
};

function findMatch(columns: string[], aliases: string[]): string | undefined {
  const lowerCols = columns.map((c) => c.toLowerCase());
  for (const alias of aliases) {
    const idx = lowerCols.indexOf(alias.toLowerCase());
    if (idx >= 0) return columns[idx];
  }
  return undefined;
}

export function autoMatchColumns(columns: string[]): Partial<ColumnMapping> {
  const mapping: Partial<ColumnMapping> = {};
  for (const [key, aliases] of Object.entries(POSITION_ALIASES)) {
    const match = findMatch(columns, aliases);
    if (match) (mapping as any)[key] = match;
  }
  for (const [key, aliases] of Object.entries(ROTATION_ALIASES)) {
    const match = findMatch(columns, aliases);
    if (match) (mapping as any)[key] = match;
  }
  return mapping;
}
