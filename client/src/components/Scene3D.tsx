import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import type { PathWithPoints } from '../types/index.js';
import PathLine from './PathLine.js';
import PathPoints from './PathPoints.js';
import OrientationAxes from './OrientationAxes.js';

interface Scene3DProps {
  path: PathWithPoints | null;
  currentIndex: number;
  showAxes: boolean;
  showLine: boolean;
  showPoints: boolean;
  onPointClick: (pointIndex: number) => void;
}

export default function Scene3D({
  path,
  currentIndex,
  showAxes,
  showLine,
  showPoints,
  onPointClick,
}: Scene3DProps) {
  const cameraTarget = useMemo(() => {
    if (!path || path.points.length === 0) return new THREE.Vector3(0, 0, 0);
    const p = path.points[currentIndex] || path.points[0];
    return new THREE.Vector3(p.x, p.y, p.z);
  }, [path, currentIndex]);

  const scaleFactor = useMemo(() => {
    if (!path || path.points.length === 0) return 1;
    const min = new THREE.Vector3(Infinity, Infinity, Infinity);
    const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
    for (const p of path.points) {
      min.min(new THREE.Vector3(p.x, p.y, p.z));
      max.max(new THREE.Vector3(p.x, p.y, p.z));
    }
    const diagonal = min.distanceTo(max);
    return diagonal > 0 ? diagonal * 0.01 : 1;
  }, [path]);

  return (
    <Canvas camera={{ position: [10, 10, 10], fov: 50 }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <Grid
        args={[100, 100]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#6b7280"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#374151"
        fadeDistance={50}
        fadeStrength={1}
        infiniteGrid
      />
      <OrbitControls target={cameraTarget} />
      {path && (
        <>
          {showLine && <PathLine points={path.points} color={path.color} />}
          {showPoints && (
            <PathPoints
              points={path.points}
              currentIndex={currentIndex}
              color={path.color}
              scaleFactor={scaleFactor}
              onPointClick={onPointClick}
            />
          )}
          {showAxes && (
            <OrientationAxes
              points={path.points}
              currentIndex={currentIndex}
              scaleFactor={scaleFactor}
            />
          )}
        </>
      )}
    </Canvas>
  );
}
