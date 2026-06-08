import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
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
  const { cameraTarget, scaleFactor, cameraPosition, near, far } = useMemo(() => {
    if (!path || path.points.length === 0) {
      return {
        cameraTarget: new THREE.Vector3(0, 0, 0),
        scaleFactor: 1,
        cameraPosition: new THREE.Vector3(10, 10, 10),
        near: 0.01,
        far: 2000,
      };
    }

    const min = new THREE.Vector3(Infinity, Infinity, Infinity);
    const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
    for (const p of path.points) {
      min.min(new THREE.Vector3(p.x, p.y, p.z));
      max.max(new THREE.Vector3(p.x, p.y, p.z));
    }

    const center = new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5);
    const diagonal = min.distanceTo(max);
    const safeDiagonal = diagonal > 0 ? diagonal : 1;
    const sf = safeDiagonal * 0.01;

    // Place camera far enough to see the whole path
    const camDist = safeDiagonal * 1.5;
    const camPos = center.clone().add(new THREE.Vector3(camDist * 0.7, camDist * 0.5, camDist * 0.7));

    // Tight near/far ratio to maximize depth buffer precision
    // near = small fraction of scene size, far = large multiple
    const n = safeDiagonal * 0.001;
    const f = safeDiagonal * 100;

    return {
      cameraTarget: center,
      scaleFactor: sf,
      cameraPosition: camPos,
      near: Math.max(n, 0.001),
      far: Math.max(f, 100),
    };
  }, [path]);

  return (
    <Canvas
      camera={{
        position: cameraPosition,
        fov: 50,
        near,
        far,
      }}
      gl={{ logarithmicDepthBuffer: true }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[100, 200, 100]} intensity={0.8} />
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
