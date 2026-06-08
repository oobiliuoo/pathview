import { useMemo } from 'react';
import * as THREE from 'three';
import type { PathPoint } from '../types/index.js';

interface OrientationAxesProps {
  points: PathPoint[];
  currentIndex: number;
  scaleFactor: number;
}

export default function OrientationAxes({ points, currentIndex, scaleFactor }: OrientationAxesProps) {
  const geometries = useMemo(() => {
    const point = points[currentIndex];
    if (!point || point.rx === null || point.ry === null || point.rz === null) return null;

    const euler = new THREE.Euler(
      THREE.MathUtils.degToRad(point.rx),
      THREE.MathUtils.degToRad(point.ry),
      THREE.MathUtils.degToRad(point.rz),
      'ZYX'
    );
    const quaternion = new THREE.Quaternion().setFromEuler(euler);
    const axisLength = scaleFactor * 3;

    const origin = [point.x, point.y, point.z];
    const xEnd = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion).multiplyScalar(axisLength).add(new THREE.Vector3(point.x, point.y, point.z));
    const yEnd = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternion).multiplyScalar(axisLength).add(new THREE.Vector3(point.x, point.y, point.z));
    const zEnd = new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion).multiplyScalar(axisLength).add(new THREE.Vector3(point.x, point.y, point.z));

    function makeGeom(end: THREE.Vector3) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute([...origin, end.x, end.y, end.z], 3));
      return g;
    }

    return {
      x: makeGeom(xEnd),
      y: makeGeom(yEnd),
      z: makeGeom(zEnd),
    };
  }, [points, currentIndex, scaleFactor]);

  if (!geometries) return null;

  return (
    <group>
      {/* X axis - Red */}
      <line geometry={geometries.x} frustumCulled={false}>
        <lineBasicMaterial color="#ef4444" linewidth={3} />
      </line>
      {/* Y axis - Green */}
      <line geometry={geometries.y} frustumCulled={false}>
        <lineBasicMaterial color="#10b981" linewidth={3} />
      </line>
      {/* Z axis - Blue */}
      <line geometry={geometries.z} frustumCulled={false}>
        <lineBasicMaterial color="#3b82f6" linewidth={3} />
      </line>
    </group>
  );
}