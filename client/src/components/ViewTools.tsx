export type ViewPreset = 'front' | 'top' | 'side' | 'iso' | 'reset';

interface ViewToolsProps {
  currentView: ViewPreset | null;
  onViewChange: (view: ViewPreset) => void;
}

const VIEWS: { key: ViewPreset; label: string; icon: string }[] = [
  { key: 'front', label: 'Front', icon: 'F' },
  { key: 'top', label: 'Top', icon: 'T' },
  { key: 'side', label: 'Side', icon: 'S' },
  { key: 'iso', label: 'Iso', icon: 'I' },
  { key: 'reset', label: 'Reset', icon: '⟲' },
];

export default function ViewTools({ currentView, onViewChange }: ViewToolsProps) {
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
    </div>
  );
}