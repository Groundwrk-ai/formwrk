/**
 * Vertical-drag interaction for the screwjacks. On pointer-down on a grab handle
 * it projects the pointer onto a vertical plane through the grab point and maps
 * world-Y movement to a millimetre extension value, clamped to [min, max].
 *
 * Uses window-level pointer listeners during the drag (robust regardless of what
 * the cursor is over) and suspends OrbitControls so the camera doesn't rotate.
 */
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export interface VerticalDragOptions {
  /** Latest value at drag start (read lazily so it's never stale). */
  getStart: () => number;
  setValue: (v: number) => void;
  min: number;
  max: number;
}

export function useVerticalDrag(opts: VerticalDragOptions) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const controls = useThree((s) => s.controls) as { enabled: boolean } | null;
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const plane = useMemo(() => new THREE.Plane(), []);

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const startVal = opts.getStart();
    const startY = e.point.y;

    // Vertical plane through the grab point, facing the camera (horizontal normal).
    const n = new THREE.Vector3(camera.position.x - e.point.x, 0, camera.position.z - e.point.z);
    if (n.lengthSq() < 1e-6) n.set(0, 0, 1);
    plane.setFromNormalAndCoplanarPoint(n.normalize(), e.point);

    if (controls) controls.enabled = false;

    const el = gl.domElement;
    const rect = el.getBoundingClientRect();
    const ndc = new THREE.Vector2();
    const hit = new THREE.Vector3();

    const onMove = (ev: PointerEvent) => {
      ndc.set(
        ((ev.clientX - rect.left) / rect.width) * 2 - 1,
        -((ev.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      if (raycaster.ray.intersectPlane(plane, hit)) {
        const deltaMm = (hit.y - startY) * 1000;
        opts.setValue(clamp(Math.round(startVal + deltaMm), opts.min, opts.max));
      }
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (controls) controls.enabled = true;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const onPointerOver = () => {
    gl.domElement.style.cursor = 'ns-resize';
  };
  const onPointerOut = () => {
    gl.domElement.style.cursor = '';
  };

  return { onPointerDown, onPointerOver, onPointerOut };
}

export type VerticalDragHandlers = ReturnType<typeof useVerticalDrag>;
