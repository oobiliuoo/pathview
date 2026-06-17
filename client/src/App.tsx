import { useState, useCallback } from 'react';
import { usePaths } from './hooks/usePaths.js';
import { usePlayback } from './hooks/usePlayback.js';
import { uploadCsv, createPath } from './api/paths.js';
import Scene3D from './components/Scene3D.js';
import PathList from './components/PathList.js';
import PointDetail from './components/PointDetail.js';
import PlaybackBar from './components/PlaybackBar.js';
import DisplayControls from './components/DisplayControls.js';
import ViewTools from './components/ViewTools.js';
import type { ViewPreset } from './components/ViewTools.js';
import ColumnMapper from './components/ColumnMapper.js';
import type { CsvUploadResult, ColumnMapping } from './types/index.js';
import './App.css';

function App() {
  const {
    paths,
    selectedPath,
    loading,
    error,
    loadPaths,
    loadPathDetail,
    removePath,
    changeColor,
  } = usePaths();

  const playback = usePlayback(selectedPath?.points || []);
  const [showAxes, setShowAxes] = useState(true);
  const [showAllAxes, setShowAllAxes] = useState(false);
  const [showLine, setShowLine] = useState(true);
  const [showPoints, setShowPoints] = useState(true);
  const [pointSize, setPointSize] = useState(1);
  const [axesFilter, setAxesFilter] = useState({ x: true, y: true, z: true });
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [uploadResult, setUploadResult] = useState<CsvUploadResult | null>(null);
  const [importFileName, setImportFileName] = useState('');
  const [viewPreset, setViewPreset] = useState<ViewPreset | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleImportCsv = useCallback(async (file: File) => {
    try {
      const result = await uploadCsv(file);
      setUploadResult(result);
      setImportFileName(file.name);
    } catch (err) {
      alert((err as Error).message);
    }
  }, []);

  const handleMappingConfirm = useCallback(async (mapping: ColumnMapping, rows: Record<string, string>[]) => {
    const points = rows.map((row) => {
      const point: Record<string, any> = {
        x: parseFloat(row[mapping.x]) || 0,
        y: parseFloat(row[mapping.y]) || 0,
        z: parseFloat(row[mapping.z]) || 0,
      };
      if (mapping.rx && row[mapping.rx] !== '' && row[mapping.rx] != null) point.rx = parseFloat(row[mapping.rx]) || 0;
      if (mapping.ry && row[mapping.ry] !== '' && row[mapping.ry] != null) point.ry = parseFloat(row[mapping.ry]) || 0;
      if (mapping.rz && row[mapping.rz] !== '' && row[mapping.rz] != null) point.rz = parseFloat(row[mapping.rz]) || 0;
      return point;
    });

    try {
      await createPath(importFileName, importFileName, points);
      setUploadResult(null);
      setImportFileName('');
      loadPaths();
    } catch (err) {
      alert((err as Error).message);
    }
  }, [importFileName, loadPaths]);

  const handlePointClick = useCallback((index: number) => {
    setSelectedPointIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    const csvFile = files.find((f) => f.name.endsWith('.csv') || f.type === 'text/csv');
    if (csvFile) {
      handleImportCsv(csvFile);
    }
  }, [handleImportCsv]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  return (
    <div className={`app ${dragOver ? 'drag-over' : ''}`} onDragOver={handleDragOver} onDrop={handleDrop} onDragLeave={handleDragLeave}>
      <div className="app-sidebar left">
        <PathList
          paths={paths}
          selectedPathId={selectedPath?.id || null}
          onSelectPath={loadPathDetail}
          onDeletePath={removePath}
          onImportCsv={handleImportCsv}
          onChangeColor={changeColor}
        />
      </div>
      <div className="app-main">
        <div className="scene-container">
          <Scene3D
            path={selectedPath}
            currentIndex={playback.currentIndex}
            showAxes={showAxes}
            showAllAxes={showAllAxes}
            showLine={showLine}
            showPoints={showPoints}
            pointSize={pointSize}
            axesFilter={axesFilter}
            viewPreset={viewPreset}
            onPointClick={handlePointClick}
          />
        </div>
        <div className="playback-container">
          <PlaybackBar
            isPlaying={playback.isPlaying}
            progress={playback.progress}
            speed={playback.speed}
            mode={playback.mode}
            onPlay={playback.start}
            onPause={playback.pause}
            onStop={playback.stop}
            onSeek={playback.seek}
            onSpeedChange={playback.setSpeed}
            onModeChange={playback.setMode}
          />
        </div>
      </div>
      <div className="app-sidebar right">
        <DisplayControls
          showAxes={showAxes}
          showAllAxes={showAllAxes}
          showLine={showLine}
          showPoints={showPoints}
          pointSize={pointSize}
          axesFilter={axesFilter}
          onToggleAxes={() => setShowAxes((prev) => !prev)}
          onToggleAllAxes={() => setShowAllAxes((prev) => !prev)}
          onToggleLine={() => setShowLine((prev) => !prev)}
          onTogglePoints={() => setShowPoints((prev) => !prev)}
          onPointSizeChange={setPointSize}
          onAxesFilterChange={setAxesFilter}
        />
        <ViewTools
          currentView={viewPreset}
          onViewChange={setViewPreset}
        />
        <PointDetail
          point={selectedPointIndex !== null ? selectedPath?.points[selectedPointIndex] || null : null}
          pointIndex={selectedPointIndex ?? 0}
          totalPoints={selectedPath?.points.length || 0}
        />
      </div>
      {uploadResult && (
        <ColumnMapper
          uploadResult={uploadResult}
          onConfirm={handleMappingConfirm}
          onCancel={() => setUploadResult(null)}
        />
      )}
    </div>
  );
}

export default App;
