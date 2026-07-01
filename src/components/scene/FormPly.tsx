/**
 * Form-Ply deck — a phenolic-faced plywood sheet, matching the supplied product photo:
 * near-black semi-gloss top/bottom faces with pale birch laminate edges. The top face
 * carries a very faint "Formwrk by Framewrk Labs" stamp that only reads when zoomed in.
 */
import { useMemo } from 'react';
import * as THREE from 'three';

const PHENOLIC = '#15171a'; // near-black phenolic coating
const PLY_EDGE = '#c9b78d'; // pale birch laminate edge

let cachedTop: THREE.CanvasTexture | null = null;

/** Dark phenolic top-face texture carrying the faint branding stamp (built once, cached). */
function brandedTopTexture(): THREE.CanvasTexture | null {
  if (cachedTop) return cachedTop;
  if (typeof document === 'undefined') return null;
  const S = 2048;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Phenolic base.
  ctx.fillStyle = PHENOLIC;
  ctx.fillRect(0, 0, S, S);

  // Very subtle sheen streaks so the face doesn't read as flat plastic.
  ctx.globalAlpha = 0.04;
  ctx.strokeStyle = '#3a3f47';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 40; i++) {
    const y = (i / 40) * S + (i % 2 ? 5 : -5);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(S, y + 9);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Faint white branding — small + low opacity, so it only reads when the camera is close.
  ctx.save();
  ctx.translate(S / 2, S / 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = "600 50px 'Segoe UI', Arial, sans-serif";
  ctx.fillText('Formwrk  by  Framewrk Labs', 0, 0);
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  cachedTop = tex;
  return tex;
}

export function PlyDeck({ position, size }: { position: [number, number, number]; size: [number, number, number] }) {
  const materials = useMemo(() => {
    const top = brandedTopTexture();
    const face = new THREE.MeshStandardMaterial(
      top ? { map: top, metalness: 0, roughness: 0.34 } : { color: PHENOLIC, metalness: 0, roughness: 0.34 },
    );
    const under = new THREE.MeshStandardMaterial({ color: PHENOLIC, metalness: 0, roughness: 0.34 });
    const edge = new THREE.MeshStandardMaterial({ color: PLY_EDGE, metalness: 0, roughness: 0.75 });
    // BoxGeometry material slots: +x, -x, +y (top), -y (bottom), +z, -z.
    return [edge, edge, face, under, edge, edge];
  }, []);

  return (
    <mesh position={position} material={materials} castShadow receiveShadow>
      <boxGeometry args={size} />
    </mesh>
  );
}
