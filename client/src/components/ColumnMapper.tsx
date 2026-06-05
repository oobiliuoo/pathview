import { useState } from 'react';
import type { ColumnMapping } from '../types/index.js';

interface ColumnMapperProps {
  columns: string[];
  initialMapping: Partial<ColumnMapping>;
  onConfirm: (mapping: ColumnMapping) => void;
  onCancel: () => void;
}

export default function ColumnMapper({
  columns,
  initialMapping,
  onConfirm,
  onCancel,
}: ColumnMapperProps) {
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>(initialMapping);

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

  const handleChange = (key: keyof ColumnMapping, value: string) => {
    setMapping((prev) => ({ ...prev, [key]: value }));
  };

  const handleConfirm = () => {
    if (!mapping.x || !mapping.y || !mapping.z) {
      alert('Please map all required fields (X, Y, Z)');
      return;
    }
    onConfirm(mapping as ColumnMapping);
  };

  const renderSelect = (key: keyof ColumnMapping, label: string, required: boolean) => (
    <div key={key} className="mapping-row">
      <label className="mapping-label">
        {label} {required && <span className="required">*</span>}
      </label>
      <select
        value={mapping[key] || ''}
        onChange={(e) => handleChange(key, e.target.value)}
        className="mapping-select"
      >
        <option value="">-- Select Column --</option>
        {columns.map((col) => (
          <option key={col} value={col}>
            {col}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="column-mapper-overlay">
      <div className="column-mapper">
        <h2>Map CSV Columns</h2>
        <div className="mapping-section">
          <h3>Required Fields</h3>
          {requiredFields.map((field) =>
            renderSelect(field.key, field.label, true)
          )}
        </div>
        <div className="mapping-section">
          <h3>Optional Fields</h3>
          {optionalFields.map((field) =>
            renderSelect(field.key, field.label, false)
          )}
        </div>
        <div className="mapping-actions">
          <button onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
          <button onClick={handleConfirm} className="btn-primary">
            Confirm Import
          </button>
        </div>
      </div>
    </div>
  );
}
