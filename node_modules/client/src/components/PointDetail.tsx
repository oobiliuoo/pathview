import type { PathPoint } from '../types/index.js';

interface PointDetailProps {
  point: PathPoint | null;
  pointIndex: number;
  totalPoints: number;
}

export default function PointDetail({ point, pointIndex, totalPoints }: PointDetailProps) {
  if (!point) {
    return (
      <div className="point-detail">
        <h3>Point Details</h3>
        <div className="empty-state">Select a point to view details</div>
      </div>
    );
  }

  return (
    <div className="point-detail">
      <h3>Point Details</h3>
      <div className="point-index">
        Point {pointIndex + 1} of {totalPoints}
      </div>
      <div className="point-coords">
        <div className="coord-row">
          <span className="coord-label">X</span>
          <span className="coord-value">{point.x.toFixed(4)}</span>
        </div>
        <div className="coord-row">
          <span className="coord-label">Y</span>
          <span className="coord-value">{point.y.toFixed(4)}</span>
        </div>
        <div className="coord-row">
          <span className="coord-label">Z</span>
          <span className="coord-value">{point.z.toFixed(4)}</span>
        </div>
      </div>
      {(point.rx !== null || point.ry !== null || point.rz !== null) && (
        <div className="point-rotation">
          <h4>Rotation</h4>
          <div className="coord-row">
            <span className="coord-label">RX</span>
            <span className="coord-value">{point.rx?.toFixed(4) ?? 'N/A'}</span>
          </div>
          <div className="coord-row">
            <span className="coord-label">RY</span>
            <span className="coord-value">{point.ry?.toFixed(4) ?? 'N/A'}</span>
          </div>
          <div className="coord-row">
            <span className="coord-label">RZ</span>
            <span className="coord-value">{point.rz?.toFixed(4) ?? 'N/A'}</span>
          </div>
        </div>
      )}
      {point.extra && Object.keys(point.extra).length > 0 && (
        <div className="point-extra">
          <h4>Extra Data</h4>
          {Object.entries(point.extra).map(([key, value]) => (
            <div key={key} className="coord-row">
              <span className="coord-label">{key}</span>
              <span className="coord-value">{String(value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
