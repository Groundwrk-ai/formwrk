/** R3F Canvas wrapper: camera, lighting, controls, ground + tower. */
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Ground } from './Ground';
import { Tower } from './Tower';
import { COLORS } from './primitives';

export function FrameScene() {
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
        shadow-camera-top={9}
        shadow-camera-bottom={-2}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-3, 5, -3]} intensity={0.4} />

      <Ground />
      <Tower />

      <OrbitControls
        target={[0, 1.4, 0]}
        enablePan
        enableZoom
        enableRotate
        minDistance={1.5}
        maxDistance={15}
        maxPolarAngle={Math.PI / 2 + 0.05}
      />
    </Canvas>
  );
}
