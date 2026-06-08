import { useState, useEffect, useRef } from 'react';
import { reparseCsv } from '../api/paths.js';
import type { ColumnMapping, CsvUploadResult } from '../types/index.js';

interface ColumnMapperProps {
  uploadResult: CsvUploadResult;
  onConfirm: (mapping: ColumnMapping, rows: Record<string, string>[]) => void;
  onCancel: () => void;
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

function autoMatch(columns: string[]): Partial<ColumnMapping> {
  const mapping: Partial<ColumnMapping> = {};
  const lowerCols = columns.map((c) => c.toLowerCase());
  for (const [key, aliases] of Object.entries(POSITION_ALIASES)) {
    for (const alias of aliases) {
      const idx = lowerCols.indexOf(alias.toLowerCase());
      if (idx >= 0) { (mapping as any)[key] = columns[idx]; break; }
    }
  }
  for (const [key, aliases] of Object.entries(ROTATION_ALIASES)) {
    for (const alias of aliases) {
      const idx = lowerCols.indexOf(alias.toLowerCase());
      if (idx >= 0) { (mapping as any)[key] = columns[idx]; break; }
    }
  }
  return mapping;
}

export default function ColumnMapper({
  uploadResult,
  onConfirm,
  onCancel,
}: ColumnMapperProps) {
  const { fileId, rawPreview, totalColumns } = uploadResult;

  const [useHeader, setUseHeader] = useState(uploadResult.hasHeader);
  const [headerRowIndex, setHeaderRowIndex] = useState(0);
  const [columns, setColumns] = useState(uploadResult.columns);
  const [previewRows, setPreviewRows] = useState<string[][]>(
    uploadResult.rawPreview.slice(uploadResult.hasHeader ? 1 : 0, (uploadResult.hasHeader ? 1 : 0) + 3)
  );
  const [currentRows, setCurrentRows] = useState(uploadResult.rows);
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>(uploadResult.mapping);
  const [loading, setLoading] = useState(false);
  const prevColumnsRef = useRef(columns);

  // Re-parse on server when header setting changes
  useEffect(() => {
    const headerRow = useHeader ? headerRowIndex : -1;
    setLoading(true);
    reparseCsv(fileId, headerRow)
      .then((result) => {
        setColumns(result.columns);
        setCurrentRows(result.rows);
        setPreviewRows(result.rawPreview.slice(headerRow >= 0 ? headerRow + 1 : 0, (headerRow >= 0 ? headerRow + 1 : 0) + 3));
        setMapping((prev) => {
          const newAuto = result.mapping;
          const merged: Partial<ColumnMapping> = {};
          for (const key of ['x', 'y', 'z', 'rx', 'ry', 'rz'] as (keyof ColumnMapping)[]) {
            const current = prev[key];
            if (current && result.columns.includes(current)) {
              (merged as any)[key] = current;
            } else {
              (merged as any)[key] = newAuto[key];
            }
          }
          return merged;
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [useHeader, headerRowIndex, fileId]);

  const handleChange = (key: keyof ColumnMapping, value: string) => {
    setMapping((prev) => ({ ...prev, [key]: value }));
  };

  const handleConfirm = () => {
    if (!mapping.x || !mapping.y || !mapping.z) {
      alert('Please map all required fields (X, Y, Z)');
      return;
    }
    onConfirm(mapping as ColumnMapping, currentRows);
  };

  const requiredFields: { key: keyof ColumnMapping; label: string }[] = [
    { key: 'x', label: 'X Position' },
    { key: 'y', label: 'Y Position' },
    { key: 'z', label: 'Z Position' },
  ];

  const optionalFields: { key: keyof ColumnMapping; label: string }[] = [
    { key: 'rx', label: 'X Rotation (RX)' },
    { key: 'ry', label: 'Y Rotation (RY)' },
    { key: 'rz', label: 'Z Rotation (RZ)' },
  ];

  return (
    <div className="column-mapper-overlay">
      <div className="column-mapper">
        <h2>Map CSV Columns</h2>

        {/* Header row selector */}
        <div className="header-selector">
          <h3>Header Row</h3>
          <div className="header-selector-options">
            <label className="control-item">
              <input
                type="radio"
                name="headerMode"
                checked={useHeader}
                onChange={() => setUseHeader(true)}
              />
              <span>First row is header</span>
            </label>
            <label className="control-item">
              <input
                type="radio"
                name="headerMode"
                checked={!useHeader}
                onChange={() => setUseHeader(false)}
              />
              <span>No header (use column index)</span>
            </label>
          </div>
          {useHeader && rawPreview.length > 1 && (
            <div className="header-row-picker">
              <label>Header row index:</label>
              <select
                value={headerRowIndex}
                onChange={(e) => setHeaderRowIndex(Number(e.target.value))}
                className="mapping-select"
              >
                {rawPreview.map((_, i) => (
                  <option key={i} value={i}>Row {i}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Data preview */}
        <div className="csv-preview">
          <h3>Data Preview {loading && '(loading...)'}</h3>
          <table className="csv-preview-table">
            <thead>
              <tr>
                {columns.map((col, i) => (
                  <th key={i}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, ri) => (
                <tr key={ri}>
                  {columns.map((_, ci) => (
                    <td key={ci}>{row[ci] ?? ''}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Column mapping */}
        <div className="mapping-section">
          <h3>Required Fields</h3>
          {requiredFields.map((field) => (
            <div key={field.key} className="mapping-row">
              <label className="mapping-label">
                {field.label} <span className="required">*</span>
              </label>
              <select
                value={mapping[field.key] || ''}
                onChange={(e) => handleChange(field.key, e.target.value)}
                className="mapping-select"
                disabled={loading}
              >
                <option value="">-- Select Column --</option>
                {columns.map((col) => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <div className="mapping-section">
          <h3>Optional Fields</h3>
          {optionalFields.map((field) => (
            <div key={field.key} className="mapping-row">
              <label className="mapping-label">{field.label}</label>
              <select
                value={mapping[field.key] || ''}
                onChange={(e) => handleChange(field.key, e.target.value)}
                className="mapping-select"
                disabled={loading}
              >
                <option value="">-- Select Column --</option>
                {columns.map((col) => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <div className="mapping-actions">
          <button onClick={onCancel} className="btn-secondary">Cancel</button>
          <button onClick={handleConfirm} className="btn-primary" disabled={loading}>Confirm Import</button>
        </div>
      </div>
    </div>
  );
}