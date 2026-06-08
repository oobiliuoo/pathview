import { useMemo } from 'react';
import * as THREE from 'three';
import type { PathPoint } from '../types/index.js';

interface OrientationAxesProps {
  points: PathPoint[];
  currentIndex: number;
  scaleFactor: number;
}

export default function OrientationAxes({ points, currentIndex, scaleFactor }: OrientationAxesProps) {
  const axesData = useMemo(() => {
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

    const xDir = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion).multiplyScalar(axisLength);
    const yDir = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternion).multiplyScalar(axisLength);
    const zDir = new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion).multiplyScalar(axisLength);

    return {
      origin: new THREE.Vector3(point.x, point.y, point.z),
      xEnd: new THREE.Vector3(point.x, point.y, point.z).add(xDir),
      yEnd: new THREE.Vector3(point.x, point.y, point.z).add(yDir),
      zEnd: new THREE.Vector3(point.x, point.y, point.z).add(zDir),
    };
  }, [points, currentIndex, scaleFactor]);

  if (!axesData) return null;

  return (
    <group>
      {/* X axis - Red */}
      <line frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([
              axesData.origin.x, axesData.origin.y, axesData.origin.z,
              axesData.xEnd.x, axesData.xEnd.y, axesData.xEnd.z,
            ])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#ef4444" linewidth={3} />
      </line>
      {/* Y axis - Green */}
      <line frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([
              axesData.origin.x, axesData.origin.y, axesData.origin.z,
              axesData.yEnd.x, axesData.yEnd.y, axesData.yEnd.z,
            ])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#10b981" linewidth={3} />
      </line>
      {/* Z axis - Blue */}
      <line frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([
              axesData.origin.x, axesData.origin.y, axesData.origin.z,
              axesData.zEnd.x, axesData.zEnd.y, axesData.zEnd.z,
            ])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#3b82f6" linewidth={3} />
      </line>
    </group>
  );
}
