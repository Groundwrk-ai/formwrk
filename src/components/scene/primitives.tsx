/** Low-level procedural primitives shared by the scene components. */
import { useMemo } from 'react';
import * as THREE from 'three';

export const COLORS = {
  bg: '#1a1e24',
  panel: '#242930',
  border: '#343c47',
  accent: '#1a6fc4',
  valid: '#2d9e6b',
  invalid: '#d94f4f',
  warn: '#d9973a',
  textPrimary: '#e8eaed',
  textSecondary: '#8b95a1',
  metal: '#c9ced6',
  collar: '#1a6fc4',
  bearer: '#8b5e3c',
  joist: '#a0713a',
  ply: '#d4b483',
  ground: '#202329',
} as const;

/** Common dimensions (metres). */
export const DIMS = {
  legSpacing: 0.6, // leg-to-leg within one H-frame (x)
  frameDepth: 0.5, // front H-frame to back H-frame (z)
  legRadius: 0.025,
  braceRadius: 0.018,
  rocketRadius: 0.022,
  rodRadius: 0.018,
  collarRadius: 0.03,
  collarHeight: 0.04,
  plate: 0.2, // flat jack base plate side
  plateThickness: 0.015,
  bearerSpan: 0.9, // z length of a bearer
  bearerWidth: 0.12, // x width of a bearer footprint
  joistSpan: 1.1, // x length of a joist
  joistWidth: 0.09, // z width of a joist
} as const;

export type Vec3 = [number, number, number];

interface MetalProps {
  color?: string;
  metalness?: number;
  roughness?: number;
}

/** A cylinder placed between two world points (for legs, braces, X-bracing, bearers as tubes). */
export function Tube({
  from,
  to,
  radius,
  color = COLORS.metal,
  metalness = 0.75,
  roughness = 0.35,
  radialSegments = 12,
}: {
  from: Vec3;
  to: Vec3;
  radius: number;
  radialSegments?: number;
} & MetalProps) {
  const { position, quaternion, length } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.clone().normalize(),
    );
    return { position: mid, quaternion: q, length: len };
  }, [from, to]);

  return (
    <mesh position={position} quaternion={quaternion} castShadow receiveShadow>
      <cylinderGeometry args={[radius, radius, length, radialSegments]} />
      <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} />
    </mesh>
  );
}

/** A box centred at `position` with given size; used for timber + plates. */
export function Box({
  position,
  size,
  color,
  metalness = 0.1,
  roughness = 0.8,
}: {
  position: Vec3;
  size: Vec3;
} & MetalProps & { color: string }) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} />
    </mesh>
  );
}
