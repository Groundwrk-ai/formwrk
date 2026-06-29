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
import { Tube, Box, DIMS, COLORS } from './primitives';
import { useVerticalDrag, type VerticalDragHandlers } from './useVerticalDrag';

/** Invisible but raycastable cylinder that captures the screwjack drag. */
function GrabHandle({
  x,
  z,
  yCenter,
  height,
  radius,
  drag,
}: {
  x: number;
  z: number;
  yCenter: number;
  height: number;
  radius: number;
  drag: VerticalDragHandlers;
}) {
  return (
    <mesh position={[x, yCenter, z]} {...drag}>
      <cylinderGeometry args={[radius, radius, height, 10]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

const hx = DIMS.legSpacing / 2;
const hz = DIMS.frameDepth / 2;
/** The four leg/column positions in the X-Z plane. */
const COLUMNS: Array<[number, number]> = [
  [-hx, -hz],
  [hx, -hz],
  [-hx, hz],
  [hx, hz],
];

function FlatJack({ seg, x, z, drag }: { seg: Segment; x: number; z: number; drag: VerticalDragHandlers }) {
  const grabH = Math.max(seg.height, 0.16) + 0.06;
  return (
    <group>
      <Box position={[x, seg.bottom + DIMS.plateThickness / 2, z]} size={[DIMS.plate, DIMS.plateThickness, DIMS.plate]} color={COLORS.metal} metalness={0.7} roughness={0.4} />
      <Tube from={[x, seg.bottom, z]} to={[x, seg.top, z]} radius={DIMS.rodRadius} />
      <mesh position={[x, seg.bottom + 0.06, z]} castShadow>
        <cylinderGeometry args={[DIMS.collarRadius, DIMS.collarRadius, DIMS.collarHeight, 16]} />
        <meshStandardMaterial color={COLORS.collar} metalness={0.5} roughness={0.4} />
      </mesh>
      <GrabHandle x={x} z={z} yCenter={seg.bottom + grabH / 2} height={grabH} radius={0.075} drag={drag} />
    </group>
  );
}

function PropInner({ seg, x, z, drag }: { seg: Segment; x: number; z: number; drag: VerticalDragHandlers }) {
  // Telescoping inner tube: a wider outer sleeve over the lower portion + inner rod.
  const sleeveTop = seg.bottom + seg.height * 0.45;
  const grabH = Math.max(seg.height, 0.16) + 0.06;
  return (
    <group>
      <Box position={[x, seg.bottom + DIMS.plateThickness / 2, z]} size={[DIMS.plate, DIMS.plateThickness, DIMS.plate]} color={COLORS.metal} metalness={0.7} roughness={0.4} />
      <Tube from={[x, seg.bottom, z]} to={[x, sleeveTop, z]} radius={DIMS.rodRadius * 1.5} />
      <Tube from={[x, sleeveTop, z]} to={[x, seg.top, z]} radius={DIMS.rodRadius} />
      <mesh position={[x, sleeveTop, z]} castShadow>
        <cylinderGeometry args={[DIMS.collarRadius, DIMS.collarRadius, DIMS.collarHeight, 16]} />
        <meshStandardMaterial color={COLORS.collar} metalness={0.5} roughness={0.4} />
      </mesh>
      <GrabHandle x={x} z={z} yCenter={seg.bottom + grabH / 2} height={grabH} radius={0.075} drag={drag} />
    </group>
  );
}

function UHead({ seg, x, z, drag }: { seg: Segment; x: number; z: number; drag: VerticalDragHandlers }) {
  const forkY = seg.top;
  const prongH = 0.13;
  const off = DIMS.bearerWidth / 2 + 0.018; // prongs sit just outside the bearer
  const grabH = Math.max(seg.height, 0.2) + 0.18;
  return (
    <group>
      <Tube from={[x, seg.bottom, z]} to={[x, forkY, z]} radius={DIMS.rodRadius} />
      {/* fork base seat */}
      <Box position={[x, forkY + 0.012, z]} size={[0.13, 0.024, 0.12]} color={COLORS.metal} metalness={0.7} roughness={0.35} />
      {/* two upright prongs cradling the bearer (bearer width runs along x) */}
      <Box position={[x - off, forkY + prongH / 2, z]} size={[0.02, prongH, 0.1]} color={COLORS.metal} metalness={0.7} roughness={0.35} />
      <Box position={[x + off, forkY + prongH / 2, z]} size={[0.02, prongH, 0.1]} color={COLORS.metal} metalness={0.7} roughness={0.35} />
      <GrabHandle x={x} z={z} yCenter={forkY - grabH / 2 + 0.12} height={grabH} radius={0.085} drag={drag} />
    </group>
  );
}

export function Tower() {
  const config = useFormworkStore((s) => s.config);
  const uHeadExtension = useFormworkStore((s) => s.uHeadExtension);
  const baseExtension = useFormworkStore((s) => s.baseExtension);
  const slabHeight = useFormworkStore((s) => s.slabHeight);
  const meetsTarget = useFormworkStore((s) => s.meetsTarget);
  const range = useFormworkStore((s) => s.range);
  const setUHeadExtension = useFormworkStore((s) => s.setUHeadExtension);
  const setBaseExtension = useFormworkStore((s) => s.setBaseExtension);

  const uHeadDrag = useVerticalDrag({
    getStart: () => useFormworkStore.getState().uHeadExtension,
    setValue: setUHeadExtension,
    min: range.uHeadMin,
    max: range.uHeadMax,
  });
  const baseDrag = useVerticalDrag({
    getStart: () => useFormworkStore.getState().baseExtension,
    setValue: setBaseExtension,
    min: range.baseMin,
    max: range.baseMax,
  });

  const layout = useMemo(
    () => computeLayout({ config, uHeadExtension, baseExtension, slabHeight }),
    [config, uHeadExtension, baseExtension, slabHeight],
  );

  const isPropInner = config.baseType === 'propInner';

  // Joist positions along z (on top of the bearers).
  const joistCount = 9;
  const joistZs = Array.from({ length: joistCount }, (_, i) =>
    DIMS.bearerSpan * 0.95 * (i / (joistCount - 1) - 0.5),
  );

  return (
    <group>
      {/* base jacks + frame stacks + rockets + U-heads, per column */}
      {COLUMNS.map(([x, z], ci) => (
        <group key={ci}>
          {isPropInner ? <PropInner seg={layout.base} x={x} z={z} drag={baseDrag} /> : <FlatJack seg={layout.base} x={x} z={z} drag={baseDrag} />}
          {layout.rocket && <Tube from={[x, layout.rocket.bottom, z]} to={[x, layout.rocket.top, z]} radius={DIMS.rocketRadius} />}
          <UHead seg={layout.uHead} x={x} z={z} drag={uHeadDrag} />
        </group>
      ))}

      {/* ladder frames front (z=-hz) + back (z=+hz), plus the diagonal
          cross-braces BETWEEN them on each side — the real shoring-frame "X" */}
      {layout.frames.map((f) => (
        <group key={f.index}>
          <HFrame bottom={f.bottom} height={f.height} z={-hz} size={f.size} />
          <HFrame bottom={f.bottom} height={f.height} z={hz} size={f.size} />
          {[-hx, hx].map((x) => (
            <group key={x}>
              <Tube from={[x, f.bottom + 0.07, -hz]} to={[x, f.top - 0.07, hz]} radius={DIMS.crossBraceRadius} />
              <Tube from={[x, f.top - 0.07, -hz]} to={[x, f.bottom + 0.07, hz]} radius={DIMS.crossBraceRadius} />
            </group>
          ))}
        </group>
      ))}

      {/* coupling collars where stacked frames join — makes 2/3-frame stacks read clearly */}
      {layout.frames.slice(1).map((f) => (
        <group key={`join-${f.index}`}>
          {COLUMNS.map(([x, z], ci) => (
            <mesh key={ci} position={[x, f.bottom, z]} castShadow>
              <cylinderGeometry args={[DIMS.legRadius * 1.45, DIMS.legRadius * 1.45, 0.085, 18]} />
              <meshStandardMaterial color="#9aa0a8" metalness={0.7} roughness={0.45} />
            </mesh>
          ))}
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

      {/* ply deck (slight overhang past the joists) */}
      <Box
        position={[0, layout.ply.bottom + layout.ply.height / 2, 0]}
        size={[DIMS.joistSpan + 0.08, layout.ply.height, DIMS.bearerSpan + 0.08]}
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
