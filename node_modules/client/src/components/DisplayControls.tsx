interface DisplayControlsProps {
  showAxes: boolean;
  showLine: boolean;
  showPoints: boolean;
  onToggleAxes: () => void;
  onToggleLine: () => void;
  onTogglePoints: () => void;
}

export default function DisplayControls({
  showAxes,
  showLine,
  showPoints,
  onToggleAxes,
  onToggleLine,
  onTogglePoints,
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
          <span>Orientation Axes</span>
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
      </div>
    </div>
  );
}
