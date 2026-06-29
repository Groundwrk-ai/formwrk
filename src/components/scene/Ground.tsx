/** Ground plane + subtle construction grid. Receives shadows. */
import { Grid } from '@react-three/drei';
import { COLORS } from './primitives';

export function Ground() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color={COLORS.ground} metalness={0} roughness={1} />
      </mesh>
      <Grid
        position={[0, 0.002, 0]}
        args={[60, 60]}
        cellSize={0.5}
        cellThickness={0.6}
        cellColor="#2c313a"
        sectionSize={2}
        sectionThickness={1}
        sectionColor="#3a4150"
        fadeDistance={22}
        fadeStrength={1.5}
        infiniteGrid
      />
    </group>
  );
}
