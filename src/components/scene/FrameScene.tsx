/** R3F Canvas wrapper: camera, lighting, reflections, soft shadows, ground + tower. */
import { useEffect, useRef, type RefObject } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Lightformer, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
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
    const dist = Math.max(4.4, topM * 1.45);
    camera.position.set(dist * 0.8, midY + topM * 0.3 + 0.6, dist);
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
      dpr={[1, 2]}
      camera={{ position: [4, 3, 5], fov: 45, near: 0.1, far: 100 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      style={{ background: COLORS.bg, position: 'absolute', inset: 0 }}
    >
      <ambientLight intensity={0.32} />
      <directionalLight position={[5, 10, 5]} intensity={1.0} />
      <directionalLight position={[-4, 5, -3]} intensity={0.3} />

      {/* Image-based lighting for metallic reflections — self-contained Lightformers,
          no HDR download. Gives the galvanised steel its highlights. */}
      <Environment resolution={256}>
        <Lightformer intensity={2.4} form="rect" position={[0, 6, 3]} scale={[10, 4, 1]} target={[0, 1, 0]} />
        <Lightformer intensity={1.1} form="rect" position={[6, 3, 4]} scale={[3, 7, 1]} target={[0, 1, 0]} />
        <Lightformer intensity={0.8} form="rect" position={[-6, 3, -3]} scale={[3, 7, 1]} target={[0, 1, 0]} />
        <Lightformer intensity={0.5} form="ring" color="#6bb0ee" position={[-4, 2, 6]} scale={2.5} target={[0, 1, 0]} />
      </Environment>

      <Ground />
      <Tower />

      {/* Soft contact shadow grounds the tower without harsh edges. */}
      <ContactShadows
        position={[0, 0.014, 0]}
        scale={7}
        far={6}
        blur={2.6}
        opacity={0.55}
        resolution={1024}
        color="#04060a"
      />

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
