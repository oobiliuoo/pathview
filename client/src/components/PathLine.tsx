import { useMemo } from 'react';
import * as THREE from 'three';
import type { PathPoint } from '../types/index.js';

interface PathLineProps {
  points: PathPoint[];
  color: string;
}

export default function PathLine({ points, color }: PathLineProps) {
  const geometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(points.length * 3);
    for (let i = 0; i < points.length; i++) {
      positions[i * 3] = points[i].x;
      positions[i * 3 + 1] = points[i].y;
      positions[i * 3 + 2] = points[i].z;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, [points]);

  return (
    <line geometry={geometry} frustumCulled={false}>
      <lineBasicMaterial color={color} linewidth={2} />
    </line>
  );
}
