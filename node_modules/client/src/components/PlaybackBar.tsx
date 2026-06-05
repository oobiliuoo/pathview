import type { PlaybackMode } from '../types/index.js';

interface PlaybackBarProps {
  isPlaying: boolean;
  progress: number;
  speed: number;
  mode: PlaybackMode;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSeek: (progress: number) => void;
  onSpeedChange: (speed: number) => void;
  onModeChange: (mode: PlaybackMode) => void;
}

export default function PlaybackBar({
  isPlaying,
  progress,
  speed,
  mode,
  onPlay,
  onPause,
  onStop,
  onSeek,
  onSpeedChange,
  onModeChange,
}: PlaybackBarProps) {
  return (
    <div className="playback-bar">
      <div className="playback-controls">
        <button onClick={onStop} className="btn-icon" title="Stop">
          ⏹
        </button>
        {isPlaying ? (
          <button onClick={onPause} className="btn-icon" title="Pause">
            ⏸
          </button>
        ) : (
          <button onClick={onPlay} className="btn-icon" title="Play">
            ▶
          </button>
        )}
      </div>
      <div className="playback-progress">
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={progress}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="progress-slider"
        />
        <span className="progress-text">{Math.round(progress * 100)}%</span>
      </div>
      <div className="playback-settings">
        <select
          value={mode}
          onChange={(e) => onModeChange(e.target.value as PlaybackMode)}
          className="mode-select"
        >
          <option value="point">Point by Point</option>
          <option value="smooth">Smooth</option>
          <option value="loop">Loop</option>
        </select>
        <div className="speed-control">
          <label>Speed:</label>
          <input
            type="range"
            min={0.1}
            max={5}
            step={0.1}
            value={speed}
            onChange={(e) => onSpeedChange(Number(e.target.value))}
            className="speed-slider"
          />
          <span>{speed.toFixed(1)}x</span>
        </div>
      </div>
    </div>
  );
}
