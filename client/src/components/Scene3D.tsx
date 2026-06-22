import { useMemo, useRef, useEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { PathPoint, PathWithPoints } from '../types/index.js';
import PathLine from './PathLine.js';
import PathPoints from './PathPoints.js';
import OrientationAxes from './OrientationAxes.js';
import type { ViewPreset, OrbitTarget } from './ViewTools.js';

function AllOrientationAxes({ points, scaleFactor, axesFilter }: { points: PathPoint[]; scaleFactor: number; axesFilter: { x: boolean; y: boolean; z: boolean } }) {
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
          {axesFilter.x && <line frustumCulled={false}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array([...axes.origin, axes.xEnd.x, axes.xEnd.y, axes.xEnd.z])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#ef4444" linewidth={1} transparent opacity={0.4} />
          </line>}
          {axesFilter.y && <line frustumCulled={false}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array([...axes.origin, axes.yEnd.x, axes.yEnd.y, axes.yEnd.z])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#10b981" linewidth={1} transparent opacity={0.4} />
          </line>}
          {axesFilter.z && <line frustumCulled={false}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array([...axes.origin, axes.zEnd.x, axes.zEnd.y, axes.zEnd.z])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#3b82f6" linewidth={1} transparent opacity={0.4} />
          </line>}
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
  pointSize: number;
  axesFilter: { x: boolean; y: boolean; z: boolean };
  orbitTarget: OrbitTarget;
  viewPreset: ViewPreset | null;
  onPointClick: (pointIndex: number) => void;
}

function CameraController({ target, orbitTargetProp, currentPointPos, diagonal, viewPreset, near, far }: { target: THREE.Vector3; orbitTargetProp: OrbitTarget; currentPointPos: THREE.Vector3 | null; diagonal: number; viewPreset: ViewPreset | null; near: number; far: number }) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const animating = useRef(false);
  const animStart = useRef({ pos: new THREE.Vector3(), target: new THREE.Vector3() });
  const animEnd = useRef({ pos: new THREE.Vector3(), target: new THREE.Vector3() });
  const animProgress = useRef(0);
  const prevPreset = useRef<ViewPreset | null>(null);

  // Set Z as the up axis and update near/far when path changes
  useEffect(() => {
    camera.up.set(0, 0, 1);
    camera.near = near;
    camera.far = far;
    camera.updateProjectionMatrix();
  }, [camera, near, far]);

  // Update orbit target when orbitTarget mode or current point changes
  const orbitCenter = orbitTargetProp === 'current' && currentPointPos ? currentPointPos : target;
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.target.copy(orbitCenter);
      controlsRef.current.update();
    }
  }, [orbitCenter]);

  useEffect(() => {
    if (!viewPreset || viewPreset === prevPreset.current) return;
    prevPreset.current = viewPreset;

    const dist = diagonal * 1.5;
    let newPos: THREE.Vector3;

    switch (viewPreset) {
      case 'front': // Look along -Y (facing XZ plane)
        newPos = target.clone().add(new THREE.Vector3(0, -dist, 0));
        break;
      case 'top': // Look along -Z (facing XY plane, Z is up)
        newPos = target.clone().add(new THREE.Vector3(0, 0, dist));
        break;
      case 'side': // Look along -X (facing YZ plane)
        newPos = target.clone().add(new THREE.Vector3(-dist, 0, 0));
        break;
      case 'iso': // Isometric: offset in X, -Y, and Z (up)
        newPos = target.clone().add(new THREE.Vector3(dist * 0.7, -dist * 0.7, dist * 0.5));
        break;
      case 'reset':
        newPos = target.clone().add(new THREE.Vector3(dist * 0.7, -dist * 0.7, dist * 0.5));
        break;
      default:
        return;
    }

    animStart.current.pos.copy(camera.position);
    animStart.current.target.copy(controlsRef.current?.target ?? orbitCenter);
    animEnd.current.pos.copy(newPos);
    animEnd.current.target.copy(orbitCenter);
    animProgress.current = 0;
    animating.current = true;
  }, [viewPreset, diagonal, camera, orbitCenter]);

  useFrame((_, delta) => {
    if (!animating.current) return;

    animProgress.current += delta * 3;
    if (animProgress.current >= 1) {
      animProgress.current = 1;
      animating.current = false;
    }

    const t = 1 - Math.pow(1 - animProgress.current, 3); // ease out cubic
    camera.position.lerpVectors(animStart.current.pos, animEnd.current.pos, t);

    if (controlsRef.current) {
      controlsRef.current.target.lerpVectors(animStart.current.target, animEnd.current.target, t);
      controlsRef.current.update();
    }

    camera.lookAt(controlsRef.current?.target ?? target);
  });

  return <OrbitControls ref={controlsRef} target={target} />;
}

export default function Scene3D({
  path,
  currentIndex,
  showAxes,
  showAllAxes,
  showLine,
  showPoints,
  pointSize,
  axesFilter,
  orbitTarget,
  viewPreset,
  onPointClick,
}: Scene3DProps) {
  const { cameraTarget, scaleFactor, cameraPosition, near, far, diagonal, currentPointPos } = useMemo(() => {
    if (!path || path.points.length === 0) {
      return {
        cameraTarget: new THREE.Vector3(0, 0, 0),
        scaleFactor: 1,
        cameraPosition: new THREE.Vector3(10, 10, 10),
        near: 0.01,
        far: 2000,
        diagonal: 10,
        currentPointPos: null,
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

    // Place camera: Z is up, offset in X, -Y, and Z
    const camDist = safeDiagonal * 1.5;
    const camPos = center.clone().add(new THREE.Vector3(camDist * 0.7, -camDist * 0.7, camDist * 0.5));

    // Tight near/far ratio to maximize depth buffer precision
    // near = small fraction of scene size, far = large multiple
    const n = safeDiagonal * 0.001;
    const f = safeDiagonal * 100;

    // Current point position for orbit center
    const pt = path.points[currentIndex];
    const currentPointPos = pt ? new THREE.Vector3(pt.x, pt.y, pt.z) : null;

    return {
      cameraTarget: center,
      scaleFactor: sf,
      cameraPosition: camPos,
      near: Math.max(n, 0.001),
      far: Math.max(f, 100),
      diagonal: safeDiagonal,
      currentPointPos,
    };
  }, [path, currentIndex]);

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
      <CameraController target={cameraTarget} orbitTargetProp={orbitTarget} currentPointPos={currentPointPos} diagonal={diagonal} viewPreset={viewPreset} near={near} far={far} />
      {path && (
        <>
          {showLine && <PathLine points={path.points} color={path.color} />}
          {showPoints && (
            <PathPoints
              points={path.points}
              currentIndex={currentIndex}
              color={path.color}
              scaleFactor={scaleFactor}
              pointSize={pointSize}
              onPointClick={onPointClick}
            />
          )}
          {showAxes && (
            <OrientationAxes
              points={path.points}
              currentIndex={currentIndex}
              scaleFactor={scaleFactor}
              axesFilter={axesFilter}
            />
          )}
          {showAllAxes && path.has_orientation && (
            <AllOrientationAxes points={path.points} scaleFactor={scaleFactor} axesFilter={axesFilter} />
          )}
        </>
      )}
    </Canvas>
  );
}
