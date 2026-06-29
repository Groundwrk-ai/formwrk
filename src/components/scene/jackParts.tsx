/**
 * Screwjack parts: a matte galvanised threaded rod and the wing nut that locks it.
 * The exposed thread reads as grooves (bump map) and is deliberately less shiny
 * than the smooth frame tubes.
 */
import { useMemo } from 'react';
import * as THREE from 'three';

/** Small grayscale canvas of horizontal bands -> ring grooves when wrapped on a rod. */
let threadCanvas: HTMLCanvasElement | null = null;
function getThreadCanvas(): HTMLCanvasElement | null {
  if (threadCanvas) return threadCanvas;
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 8;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  const bands = [60, 110, 190, 255, 190, 110, 60, 30];
  for (let y = 0; y < bands.length; y++) {
    ctx.fillStyle = `rgb(${bands[y]},${bands[y]},${bands[y]})`;
    ctx.fillRect(0, y, c.width, 1);
  }
  threadCanvas = c;
  return c;
}

const THREAD_PITCH = 0.013; // metres per thread band

const ROD_COLOR = '#aeb4bc';
const NUT_COLOR = '#c4cad2';

/** A threaded, matte galvanised rod between two heights. */
export function ThreadedRod({
  x,
  z,
  bottom,
  top,
  radius,
}: {
  x: number;
  z: number;
  bottom: number;
  top: number;
  radius: number;
}) {
  const height = Math.max(top - bottom, 0.001);
  const tex = useMemo(() => {
    const canvas = getThreadCanvas();
    if (!canvas) return null;
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1, Math.max(2, Math.round(height / THREAD_PITCH)));
    t.needsUpdate = true;
    return t;
  }, [height]);

  return (
    <mesh position={[x, bottom + height / 2, z]} castShadow>
      <cylinderGeometry args={[radius, radius, height, 16]} />
      <meshStandardMaterial
        color={ROD_COLOR}
        metalness={0.45}
        roughness={0.62}
        bumpMap={tex ?? undefined}
        bumpScale={1.2}
      />
    </mesh>
  );
}

/** The butterfly/wing nut that locks the jack at height. */
export function WingNut({ x, y, z }: { x: number; y: number; z: number }) {
  return (
    <group position={[x, y, z]}>
      {/* hex nut body */}
      <mesh castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.05, 6]} />
        <meshStandardMaterial color={NUT_COLOR} metalness={0.7} roughness={0.42} />
      </mesh>
      {/* two flat wings */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.085, 0.006, 0]} rotation={[0, 0, s * 0.22]} castShadow>
          <boxGeometry args={[0.105, 0.015, 0.04]} />
          <meshStandardMaterial color={NUT_COLOR} metalness={0.7} roughness={0.42} />
        </mesh>
      ))}
    </group>
  );
}
