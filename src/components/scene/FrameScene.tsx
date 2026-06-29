/** R3F Canvas wrapper: camera, lighting, controls, ground + tower. */
import { useEffect, useRef, type RefObject } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Ground } from './Ground';
import { Tower } from './Tower';
import { COLORS } from './primitives';
import { useFormworkStore } from '../../store/formworkStore';

/**
 * Reframes the camera when the assembly's frame count changes (single/double/
 * triple), so tall towers stay in view. Deliberately does NOT refit on every
 * height tweak, so the user can orbit/zoom freely while dragging screwjacks.
 */
function CameraRig({ controlsRef }: { controlsRef: RefObject<any> }) {
  const frameCount = useFormworkStore((s) => s.config.frames.length);
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    const topM = useFormworkStore.getState().currentHeight / 1000;
    const midY = topM / 2;
    const dist = Math.max(3.5, topM * 1.5);
    camera.position.set(dist * 0.75, midY + topM * 0.35, dist);
    camera.lookAt(0, midY, 0);
    const c = controlsRef.current;
    if (c) {
      c.target.set(0, midY, 0);
      c.update();
    }
  }, [frameCount, camera, controlsRef]);

  return null;
}

export function FrameScene() {
  const controlsRef = useRef<any>(null);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [3, 2.4, 4], fov: 45, near: 0.1, far: 100 }}
      style={{ background: COLORS.bg, position: 'absolute', inset: 0 }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={10}
        shadow-camera-bottom={-2}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-3, 5, -3]} intensity={0.4} />

      <Ground />
      <Tower />

      <OrbitControls
        ref={controlsRef}
        makeDefault
        target={[0, 1.4, 0]}
        enablePan
        enableZoom
        enableRotate
        minDistance={1.5}
        maxDistance={20}
        maxPolarAngle={Math.PI / 2 + 0.05}
      />
      <CameraRig controlsRef={controlsRef} />
    </Canvas>
  );
}
