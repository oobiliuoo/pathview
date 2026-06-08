import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { PathPoint, PathWithPoints } from '../types/index.js';
import PathLine from './PathLine.js';
import PathPoints from './PathPoints.js';
import OrientationAxes from './OrientationAxes.js';

function AllOrientationAxes({ points, scaleFactor }: { points: PathPoint[]; scaleFactor: number }) {
  const geometries = useMemo(() => {
    const result: { origin: number[]; xEnd: THREE.Vector3; yEnd: THREE.Vector3; zEnd: THREE.Vector3 }[] = [];
    const axisLength = scaleFactor * 2;

    for (const point of points) {
      if (point.rx === null || point.ry === null || point.rz === null) continue;

      const euler = new THREE.Euler(
        THREE.MathUtils.degToRad(point.rx),
        THREE.MathUtils.degToRad(point.ry),
        THREE.MathUtils.degToRad(point.rz),
        'ZYX'
      );
      const quaternion = new THREE.Quaternion().setFromEuler(euler);
      const origin = [point.x, point.y, point.z];
      const xEnd = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion).multiplyScalar(axisLength).add(new THREE.Vector3(point.x, point.y, point.z));
      const yEnd = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternion).multiplyScalar(axisLength).add(new THREE.Vector3(point.x, point.y, point.z));
      const zEnd = new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion).multiplyScalar(axisLength).add(new THREE.Vector3(point.x, point.y, point.z));

      result.push({ origin, xEnd, yEnd, zEnd });
    }
    return result;
  }, [points, scaleFactor]);

  if (geometries.length === 0) return null;

  return (
    <group>
      {geometries.map((axes, i) => (
        <group key={i}>
          <line frustumCulled={false}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array([...axes.origin, axes.xEnd.x, axes.xEnd.y, axes.xEnd.z])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#ef4444" linewidth={1} transparent opacity={0.4} />
          </line>
          <line frustumCulled={false}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array([...axes.origin, axes.yEnd.x, axes.yEnd.y, axes.yEnd.z])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#10b981" linewidth={1} transparent opacity={0.4} />
          </line>
          <line frustumCulled={false}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array([...axes.origin, axes.zEnd.x, axes.zEnd.y, axes.zEnd.z])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#3b82f6" linewidth={1} transparent opacity={0.4} />
          </line>
        </group>
      ))}
    </group>
  );
}

interface Scene3DProps {
  path: PathWithPoints | null;
  currentIndex: number;
  showAxes: boolean;
  showAllAxes: boolean;
  showLine: boolean;
  showPoints: boolean;
  onPointClick: (pointIndex: number) => void;
}

export default function Scene3D({
  path,
  currentIndex,
  showAxes,
  showAllAxes,
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
          {showAllAxes && path.has_orientation && (
            <AllOrientationAxes points={path.points} scaleFactor={scaleFactor} />
          )}
        </>
      )}
    </Canvas>
  );
}
