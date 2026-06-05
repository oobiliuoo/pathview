import { useState, useRef, ChangeEvent } from 'react';
import type { Path } from '../types/index.js';

interface PathListProps {
  paths: Path[];
  selectedPathId: number | null;
  onSelectPath: (id: number) => void;
  onDeletePath: (id: number) => void;
  onImportCsv: (file: File) => void;
}

export default function PathList({
  paths,
  selectedPathId,
  onSelectPath,
  onDeletePath,
  onImportCsv,
}: PathListProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportCsv(file);
      e.target.value = '';
    }
  };

  return (
    <div className="path-list">
      <div className="path-list-header">
        <h2>Paths</h2>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="btn-import"
        >
          Import CSV
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden-input"
        />
      </div>
      <div className="path-list-items">
        {paths.length === 0 ? (
          <div className="empty-state">No paths imported yet</div>
        ) : (
          paths.map((path) => (
            <div
              key={path.id}
              className={`path-item ${selectedPathId === path.id ? 'selected' : ''}`}
              onClick={() => onSelectPath(path.id)}
            >
              <div className="path-info">
                <span
                  className="path-color"
                  style={{ backgroundColor: path.color }}
                />
                <span className="path-name">{path.name}</span>
              </div>
              <div className="path-meta">
                <span>{path.point_count} points</span>
                {path.has_orientation && (
                  <span className="orientation-badge">Orientation</span>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeletePath(path.id);
                }}
                className="btn-delete"
                title="Delete path"
              >
                🗑
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
