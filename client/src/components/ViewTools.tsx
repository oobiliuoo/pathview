export type ViewPreset = 'front' | 'top' | 'side' | 'iso' | 'reset';
export type OrbitTarget = 'center' | 'current';

interface ViewToolsProps {
  currentView: ViewPreset | null;
  orbitTarget: OrbitTarget;
  onViewChange: (view: ViewPreset) => void;
  onOrbitTargetChange: (target: OrbitTarget) => void;
}

const VIEWS: { key: ViewPreset; label: string; icon: string }[] = [
  { key: 'front', label: 'Front', icon: 'F' },
  { key: 'top', label: 'Top', icon: 'T' },
  { key: 'side', label: 'Side', icon: 'S' },
  { key: 'iso', label: 'Iso', icon: 'I' },
  { key: 'reset', label: 'Reset', icon: '⟲' },
];

export default function ViewTools({ currentView, orbitTarget, onViewChange, onOrbitTargetChange }: ViewToolsProps) {
  return (
    <div className="view-tools">
      <h3>View Tools</h3>
      <div className="view-buttons">
        {VIEWS.map(({ key, label, icon }) => (
          <button
            key={key}
            className={`view-btn ${currentView === key ? 'active' : ''}`}
            onClick={() => onViewChange(key)}
            title={label}
          >
            <span className="view-icon">{icon}</span>
            <span className="view-label">{label}</span>
          </button>
        ))}
      </div>
      <div className="orbit-target-selector">
        <h3>Orbit Center</h3>
        <select
          value={orbitTarget}
          onChange={(e) => onOrbitTargetChange(e.target.value as OrbitTarget)}
          className="mapping-select"
        >
          <option value="center">Path Center</option>
          <option value="current">Current Point</option>
        </select>
      </div>
    </div>
  );
}