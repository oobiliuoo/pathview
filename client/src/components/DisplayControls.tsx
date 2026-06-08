interface DisplayControlsProps {
  showAxes: boolean;
  showAllAxes: boolean;
  showLine: boolean;
  showPoints: boolean;
  onToggleAxes: () => void;
  onToggleAllAxes: () => void;
  onToggleLine: () => void;
  onTogglePoints: () => void;
}

export default function DisplayControls({
  showAxes,
  showAllAxes,
  showLine,
  showPoints,
  onToggleAxes,
  onToggleAllAxes,
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
      </div>
    </div>
  );
}
