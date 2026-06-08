import { useState, useRef, ChangeEvent } from 'react';
import type { Path } from '../types/index.js';

// 7 hues × 5 brightness levels
const COLOR_PALETTE = [
  { name: 'Red',    shades: ['#fecaca','#f87171','#ef4444','#dc2626','#991b1b'] },
  { name: 'Orange', shades: ['#fed7aa','#fb923c','#f97316','#ea580c','#c2410c'] },
  { name: 'Yellow', shades: ['#fef08a','#facc15','#eab308','#ca8a04','#a16207'] },
  { name: 'Green',  shades: ['#bbf7d0','#4ade80','#22c55e','#16a34a','#15803d'] },
  { name: 'Blue',   shades: ['#bfdbfe','#60a5fa','#3b82f6','#2563eb','#1e40af'] },
  { name: 'Purple', shades: ['#e9d5ff','#c084fc','#a855f7','#9333ea','#7e22ce'] },
  { name: 'Cyan',   shades: ['#a5f3fc','#22d3ee','#06b6d4','#0891b2','#0e7490'] },
];

interface PathListProps {
  paths: Path[];
  selectedPathId: number | null;
  onSelectPath: (id: number) => void;
  onDeletePath: (id: number) => void;
  onImportCsv: (file: File) => void;
  onChangeColor: (id: number, color: string) => void;
}

export default function PathList({
  paths,
  selectedPathId,
  onSelectPath,
  onDeletePath,
  onImportCsv,
  onChangeColor,
}: PathListProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [colorPickerId, setColorPickerId] = useState<number | null>(null);

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
                  onClick={(e) => {
                    e.stopPropagation();
                    setColorPickerId(colorPickerId === path.id ? null : path.id);
                  }}
                />
                <span className="path-name">{path.name}</span>
              </div>
              {colorPickerId === path.id && (
                <div className="color-picker" onClick={(e) => e.stopPropagation()}>
                  {COLOR_PALETTE.map((hue) => (
                    <div key={hue.name} className="color-picker-row">
                      {hue.shades.map((shade) => (
                        <button
                          key={shade}
                          className={`color-swatch ${shade === path.color ? 'active' : ''}`}
                          style={{ backgroundColor: shade }}
                          onClick={() => {
                            onChangeColor(path.id, shade);
                            setColorPickerId(null);
                          }}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              )}
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
