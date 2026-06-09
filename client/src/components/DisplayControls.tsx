interface DisplayControlsProps {
  showAxes: boolean;
  showAllAxes: boolean;
  showLine: boolean;
  showPoints: boolean;
  pointSize: number;
  onToggleAxes: () => void;
  onToggleAllAxes: () => void;
  onToggleLine: () => void;
  onTogglePoints: () => void;
  onPointSizeChange: (size: number) => void;
}

export default function DisplayControls({
  showAxes,
  showAllAxes,
  showLine,
  showPoints,
  pointSize,
  onToggleAxes,
  onToggleAllAxes,
  onToggleLine,
  onTogglePoints,
  onPointSizeChange,
}: DisplayControlsProps) {
  return (
    <div className="display-controls">
      <h3>Display</h3>
      <div className="control-group">
        <label className="control-item">
          <input
            type="checkbox"
            checked={showAxes}
            onChange={onToggleAxes}
          />
          <span>Current Axes</span>
        </label>
        <label className="control-item">
          <input
            type="checkbox"
            checked={showAllAxes}
            onChange={onToggleAllAxes}
          />
          <span>All Point Axes</span>
        </label>
        <label className="control-item">
          <input
            type="checkbox"
            checked={showLine}
            onChange={onToggleLine}
          />
          <span>Path Line</span>
        </label>
        <label className="control-item">
          <input
            type="checkbox"
            checked={showPoints}
            onChange={onTogglePoints}
          />
          <span>Point Markers</span>
        </label>
        <div className="control-item slider-item">
          <span>Size</span>
          <input
            type="range"
            min="1"
            max="500"
            step="1"
            value={Math.round(pointSize * 100)}
            onChange={(e) => onPointSizeChange(parseInt(e.target.value) / 100)}
            className="size-slider"
          />
          <span className="size-value">{Math.round(pointSize * 100)}%</span>
        </div>
      </div>
    </div>
  );
}
