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
  legSpacing: 1.15, // leg-to-leg within one ladder frame (x) — real frames are wide
  frameDepth: 1.15, // front ladder to back ladder (z) — roughly square bay
  legRadius: 0.03, // ~60mm OD leg
  braceRadius: 0.021,
  crossBraceRadius: 0.013, // removable diagonal braces — much thinner than the frame tubes
  rocketRadius: 0.026,
  rodRadius: 0.02,
  collarRadius: 0.034,
  collarHeight: 0.04,
  plate: 0.22, // flat jack base plate side
  plateThickness: 0.016,
  bearerSpan: 1.55, // z length of a bearer (spans the bay + overhang)
  bearerWidth: 0.077, // x width of a bearer (LVL 150x77 on edge)
  joistSpan: 1.55, // x length of a joist
  joistWidth: 0.065, // z width of a joist (LVL 95x65)
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
