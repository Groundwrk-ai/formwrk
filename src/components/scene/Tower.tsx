/**
 * The full shoring tower, composed procedurally from the live layout.
 * Two H-frame columns (front + back), four legs, a base jack + U-head per leg,
 * optional rocket tubes, and the timber deck (bearers -> joists -> ply).
 * The top of the ply sits exactly at `currentHeight` (truthful to the calc),
 * and the ghost soffit plane sits at the target slab height.
 */
import { useMemo } from 'react';
import { Edges } from '@react-three/drei';
import { useFormworkStore } from '../../store/formworkStore';
import { computeLayout, type Segment } from '../../logic/layout';
import { HFrame } from './HFrame';
import { Tube, Box, DIMS, COLORS, type Vec3 } from './primitives';

const hx = DIMS.legSpacing / 2;
const hz = DIMS.frameDepth / 2;
/** The four leg/column positions in the X-Z plane. */
const COLUMNS: Array<[number, number]> = [
  [-hx, -hz],
  [hx, -hz],
  [-hx, hz],
  [hx, hz],
];

function FlatJack({ seg, x, z }: { seg: Segment; x: number; z: number }) {
  return (
    <group>
      <Box position={[x, seg.bottom + DIMS.plateThickness / 2, z]} size={[DIMS.plate, DIMS.plateThickness, DIMS.plate]} color={COLORS.metal} metalness={0.7} roughness={0.4} />
      <Tube from={[x, seg.bottom, z]} to={[x, seg.top, z]} radius={DIMS.rodRadius} />
      <mesh position={[x, seg.bottom + 0.06, z]} castShadow>
        <cylinderGeometry args={[DIMS.collarRadius, DIMS.collarRadius, DIMS.collarHeight, 16]} />
        <meshStandardMaterial color={COLORS.collar} metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  );
}

function PropInner({ seg, x, z }: { seg: Segment; x: number; z: number }) {
  // Telescoping inner tube: a wider outer sleeve over the lower portion + inner rod.
  const sleeveTop = seg.bottom + seg.height * 0.45;
  return (
    <group>
      <Box position={[x, seg.bottom + DIMS.plateThickness / 2, z]} size={[DIMS.plate, DIMS.plateThickness, DIMS.plate]} color={COLORS.metal} metalness={0.7} roughness={0.4} />
      <Tube from={[x, seg.bottom, z]} to={[x, sleeveTop, z]} radius={DIMS.rodRadius * 1.5} />
      <Tube from={[x, sleeveTop, z]} to={[x, seg.top, z]} radius={DIMS.rodRadius} />
      <mesh position={[x, sleeveTop, z]} castShadow>
        <cylinderGeometry args={[DIMS.collarRadius, DIMS.collarRadius, DIMS.collarHeight, 16]} />
        <meshStandardMaterial color={COLORS.collar} metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  );
}

function UHead({ seg, x, z }: { seg: Segment; x: number; z: number }) {
  const prong: Vec3 = [0.025, 0.1, DIMS.bearerWidth + 0.03];
  return (
    <group>
      <Tube from={[x, seg.bottom, z]} to={[x, seg.top, z]} radius={DIMS.rodRadius} />
      {/* fork: two prongs cradling the bearer (which runs along z) */}
      <Box position={[x - 0.07, seg.top + 0.05, z]} size={prong} color={COLORS.metal} metalness={0.7} roughness={0.35} />
      <Box position={[x + 0.07, seg.top + 0.05, z]} size={prong} color={COLORS.metal} metalness={0.7} roughness={0.35} />
    </group>
  );
}

export function Tower() {
  const config = useFormworkStore((s) => s.config);
  const uHeadExtension = useFormworkStore((s) => s.uHeadExtension);
  const baseExtension = useFormworkStore((s) => s.baseExtension);
  const slabHeight = useFormworkStore((s) => s.slabHeight);
  const meetsTarget = useFormworkStore((s) => s.meetsTarget);

  const layout = useMemo(
    () => computeLayout({ config, uHeadExtension, baseExtension, slabHeight }),
    [config, uHeadExtension, baseExtension, slabHeight],
  );

  const isPropInner = config.baseType === 'propInner';

  // Joist positions along z (on top of the bearers).
  const joistCount = 4;
  const joistZs = Array.from({ length: joistCount }, (_, i) =>
    DIMS.bearerSpan * (i / (joistCount - 1) - 0.5),
  );

  return (
    <group>
      {/* base jacks + frame stacks + rockets + U-heads, per column */}
      {COLUMNS.map(([x, z], ci) => (
        <group key={ci}>
          {isPropInner ? <PropInner seg={layout.base} x={x} z={z} /> : <FlatJack seg={layout.base} x={x} z={z} />}
          {layout.rocket && <Tube from={[x, layout.rocket.bottom, z]} to={[x, layout.rocket.top, z]} radius={DIMS.rocketRadius} />}
          <UHead seg={layout.uHead} x={x} z={z} />
        </group>
      ))}

      {/* H-frames: front (z=-hz) and back (z=+hz), one per stacked frame segment */}
      {layout.frames.map((f) => (
        <group key={f.index}>
          <HFrame bottom={f.bottom} height={f.height} z={-hz} />
          <HFrame bottom={f.bottom} height={f.height} z={hz} />
        </group>
      ))}

      {/* bearers: run along z at x = ±hx, resting on the U-heads */}
      {[-hx, hx].map((x) => (
        <Box
          key={x}
          position={[x, layout.bearer.bottom + layout.bearer.height / 2, 0]}
          size={[DIMS.bearerWidth, layout.bearer.height, DIMS.bearerSpan]}
          color={COLORS.bearer}
        />
      ))}

      {/* joists: run along x, on top of the bearers */}
      {joistZs.map((z, i) => (
        <Box
          key={i}
          position={[0, layout.joist.bottom + layout.joist.height / 2, z]}
          size={[DIMS.joistSpan, layout.joist.height, DIMS.joistWidth]}
          color={COLORS.joist}
        />
      ))}

      {/* ply deck */}
      <Box
        position={[0, layout.ply.bottom + layout.ply.height / 2, 0]}
        size={[DIMS.joistSpan, layout.ply.height, DIMS.bearerSpan]}
        color={COLORS.ply}
      />

      {/* ghost soffit plane at the target height — the slab underside to dial up to */}
      <mesh position={[0, layout.soffitY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[DIMS.joistSpan + 0.4, DIMS.bearerSpan + 0.4]} />
        <meshStandardMaterial
          color={meetsTarget ? COLORS.valid : COLORS.accent}
          transparent
          opacity={0.22}
          metalness={0}
          roughness={1}
          side={2}
        />
        <Edges threshold={15} color={meetsTarget ? COLORS.valid : '#6bb0ee'} />
      </mesh>
    </group>
  );
}
