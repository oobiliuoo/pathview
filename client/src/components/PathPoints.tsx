import { useState } from 'react';
import * as THREE from 'three';
import type { PathPoint } from '../types/index.js';

interface PathPointsProps {
  points: PathPoint[];
  currentIndex: number;
  color: string;
  scaleFactor: number;
  pointSize: number;
  onPointClick: (pointIndex: number) => void;
}

export default function PathPoints({
  points,
  currentIndex,
  color,
  scaleFactor,
  pointSize,
  onPointClick,
}: PathPointsProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <group>
      {points.map((point, index) => {
        const isCurrent = index === currentIndex;
        const isHovered = index === hoveredIndex;
        const size = (isCurrent ? scaleFactor * 1.5 : isHovered ? scaleFactor * 1.2 : scaleFactor) * 0.5 * pointSize;
        
        return (
          <mesh
            key={point.id}
            position={[point.x, point.y, point.z]}
            onPointerOver={() => setHoveredIndex(index)}
            onPointerOut={() => setHoveredIndex(null)}
            onClick={() => onPointClick(index)}
          >
            <sphereGeometry args={[size, 16, 16]} />
            <meshStandardMaterial
              color={isCurrent ? '#ef4444' : isHovered ? '#f59e0b' : color}
              emissive={isCurrent ? '#ef4444' : '#000000'}
              emissiveIntensity={isCurrent ? 0.5 : 0}
            />
          </mesh>
        );
      })}
    </group>
  );
}
