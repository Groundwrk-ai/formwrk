/**
 * The full shoring tower, composed procedurally from the live layout.
 * Two H-frame columns (front + back), four legs, a base jack + U-head per leg,
 * optional rocket tubes, and the timber deck (bearers -> joists -> ply).
 * The top of the ply sits exactly at `currentHeight` (truthful to the calc),
 * and the ghost soffit plane sits at the target slab height.
 *
 * Each logical component type is wrapped in a <PosedPart>, so the view-mode
 * engine (transition.tsx) can fan the parts apart for the EXPLODE view (with a
 * label per type) and ghost the whole tower for the PACKED view, while still
 * playing the staggered ground-up BUILD whenever the configuration changes.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Edges, Html } from '@react-three/drei';
import type { Group, MeshStandardMaterial, LineBasicMaterial } from 'three';
import { useFormworkStore } from '../../store/formworkStore';
import { computeLayout, type Segment } from '../../logic/layout';
import { HFrame } from './HFrame';
import { Tube, Box, DIMS, COLORS } from './primitives';
import { useVerticalDrag, type VerticalDragHandlers } from './useVerticalDrag';
import { ThreadedRod, WingNut, PinnedTube, Pin, Extension } from './jackParts';
import { BAY_QUANTITIES } from '../../logic/bayLayout';
import { PosedPart, GhostController, useTransition, sampleWeights } from './transition';

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

/** A floating label for the EXPLODE view (one per component type). */
function Tag({ y, x = 0, z = 0, text, sub }: { y: number; x?: number; z?: number; text: string; sub?: string }) {
  return (
    <Html position={[x, y, z]} center distanceFactor={7} zIndexRange={[15, 0]} style={{ pointerEvents: 'none' }}>
      <div className="part-label">
        {text}
        {sub ? <span className="part-sub">{sub}</span> : null}
      </div>
    </Html>
  );
}

// Representational FULL physical lengths of the adjustable members (metres).
// We always draw the member at full length: in the assembled view the opaque,
// concentric frame leg occludes the portion sitting inside it; in explode/pack
// (the leg moved away or ghosted) the full thread/tube — including what was
// hidden in the frame — is revealed, which is what the real part looks like once
// it's out of the frame.
const FULL_LENGTH = { flatJack: 0.64, uHead: 0.64, propInner: 1.2 } as const;

function FlatJack({ seg, x, z, drag, interactive }: { seg: Segment; x: number; z: number; drag: VerticalDragHandlers; interactive: boolean }) {
  const grabH = Math.max(seg.height, 0.16) + 0.06;
  // Wing nut sits against the frame above (that's what holds the height).
  const nutY = Math.max(seg.top - 0.04, seg.bottom + 0.04);
  const rodTop = Math.max(seg.top, seg.bottom + FULL_LENGTH.flatJack); // full rod; the inside-frame part is occluded when assembled
  return (
    <group>
      <Box position={[x, seg.bottom + DIMS.plateThickness / 2, z]} size={[DIMS.plate, DIMS.plateThickness, DIMS.plate]} color={COLORS.metal} metalness={0.7} roughness={0.4} />
      <ThreadedRod x={x} z={z} bottom={seg.bottom} top={rodTop} radius={DIMS.rodRadius} />
      <WingNut x={x} y={nutY} z={z} />
      {interactive && <GrabHandle x={x} z={z} yCenter={seg.bottom + grabH / 2} height={grabH} radius={0.075} drag={drag} />}
    </group>
  );
}

function PropInner({ seg, x, z, drag, interactive }: { seg: Segment; x: number; z: number; drag: VerticalDragHandlers; interactive: boolean }) {
  // Smooth galvanised inner tube that slides into the leg and is held by a PIN (not a screwjack).
  const grabH = Math.max(seg.height, 0.16) + 0.06;
  const tubeR = DIMS.rodRadius * 1.4;
  const pinY = Math.max(seg.top - 0.05, seg.bottom + 0.06); // pin sits against the frame above
  const tubeTop = Math.max(seg.top, seg.bottom + FULL_LENGTH.propInner); // full tube; inside-frame part occluded when assembled
  return (
    <group>
      <Box position={[x, seg.bottom + DIMS.plateThickness / 2, z]} size={[DIMS.plate, DIMS.plateThickness, DIMS.plate]} color={COLORS.metal} metalness={0.7} roughness={0.4} />
      <PinnedTube x={x} z={z} bottom={seg.bottom} top={tubeTop} radius={tubeR} />
      <Pin x={x} y={pinY} z={z} span={tubeR * 2 + 0.05} />
      {interactive && <GrabHandle x={x} z={z} yCenter={seg.bottom + grabH / 2} height={grabH} radius={0.075} drag={drag} />}
    </group>
  );
}

function UHead({ seg, x, z, drag, interactive }: { seg: Segment; x: number; z: number; drag: VerticalDragHandlers; interactive: boolean }) {
  const forkY = seg.top;
  const prongH = 0.13;
  const off = DIMS.bearerWidth / 2 + 0.018; // prongs sit just outside the bearer
  const grabH = Math.max(seg.height, 0.2) + 0.18;
  // Wing nut sits against the frame below (the frame leg top) — that's what holds the height.
  const nutY = seg.bottom + 0.04;
  const rodBottom = Math.min(seg.bottom, forkY - FULL_LENGTH.uHead); // full rod extends down into the frame (occluded when assembled)
  return (
    <group>
      <ThreadedRod x={x} z={z} bottom={rodBottom} top={forkY} radius={DIMS.rodRadius} />
      <WingNut x={x} y={nutY} z={z} />
      {/* fork base seat */}
      <Box position={[x, forkY + 0.012, z]} size={[0.13, 0.024, 0.12]} color={COLORS.metal} metalness={0.7} roughness={0.35} />
      {/* two upright prongs cradling the bearer (bearer width runs along x) */}
      <Box position={[x - off, forkY + prongH / 2, z]} size={[0.02, prongH, 0.1]} color={COLORS.metal} metalness={0.7} roughness={0.35} />
      <Box position={[x + off, forkY + prongH / 2, z]} size={[0.02, prongH, 0.1]} color={COLORS.metal} metalness={0.7} roughness={0.35} />
      {interactive && <GrabHandle x={x} z={z} yCenter={forkY - grabH / 2 + 0.12} height={grabH} radius={0.085} drag={drag} />}
    </group>
  );
}

/** Ghost soffit plane — the target slab underside. Only present in the assembled view. */
function SoffitPlane({ y, meetsTarget }: { y: number; meetsTarget: boolean }) {
  const { driver } = useTransition();
  const matRef = useRef<MeshStandardMaterial>(null);
  const edgeRef = useRef<LineBasicMaterial>(null);
  useFrame(() => {
    const w = sampleWeights(driver.current);
    const visible = 1 - Math.max(w.explode, w.ghost); // only present in the assembled view
    if (matRef.current) matRef.current.opacity = 0.22 * visible;
    if (edgeRef.current) edgeRef.current.opacity = visible;
  });
  return (
    <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[DIMS.joistSpan + 0.4, DIMS.bearerSpan + 0.4]} />
      <meshStandardMaterial ref={matRef} color={meetsTarget ? COLORS.valid : COLORS.accent} transparent opacity={0.22} metalness={0} roughness={1} side={2} />
      <Edges threshold={15}>
        <lineBasicMaterial ref={edgeRef} color={meetsTarget ? COLORS.valid : '#6bb0ee'} transparent />
      </Edges>
    </mesh>
  );
}

const sizeLabel = (size: string): string => size.replace('ft', 'Ft');
/** Vertical gap (m) inserted between layers per build-stage in the explode view. */
const EXPLODE_MARGIN = 0.42;

export function Tower() {
  const config = useFormworkStore((s) => s.config);
  const uHeadExtension = useFormworkStore((s) => s.uHeadExtension);
  const baseExtension = useFormworkStore((s) => s.baseExtension);
  const slabHeight = useFormworkStore((s) => s.slabHeight);
  const meetsTarget = useFormworkStore((s) => s.meetsTarget);
  const range = useFormworkStore((s) => s.range);
  const viewMode = useFormworkStore((s) => s.viewMode);
  const setUHeadExtension = useFormworkStore((s) => s.setUHeadExtension);
  const setBaseExtension = useFormworkStore((s) => s.setBaseExtension);

  const interactive = viewMode === 'assembled';
  const showLabels = viewMode === 'exploded';

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
  const rocket = layout.rocket;

  // Joist positions along z (on top of the bearers). Shared with the BOM.
  const joistCount = BAY_QUANTITIES.joists;
  const joistZs = Array.from({ length: joistCount }, (_, i) => DIMS.bearerSpan * 0.95 * (i / (joistCount - 1) - 0.5));

  // Build-sequence stage indices (ground up): base -> each frame -> braces ->
  // extension -> U-heads -> bearers -> joists -> ply. Same index drives both the
  // staggered build order AND the per-layer gap in the exploded view.
  let o = 0;
  const baseStage = o++;
  const frameStages = layout.frames.map(() => o++);
  const braceStage = o++;
  const extStage = rocket ? o++ : -1;
  const uHeadStage = o++;
  const bearerStage = o++;
  const joistStage = o++;
  const plyStage = o++;
  const maxStage = o - 1;
  const lift = (stage: number): [number, number, number] => [0, stage * EXPLODE_MARGIN, 0];

  // Per-size frame label data (one label per distinct size, matching the BOM).
  const sizeCounts: Record<string, number> = {};
  const labelLevel: Record<string, number> = {};
  layout.frames.forEach((f) => {
    sizeCounts[f.size] = (sizeCounts[f.size] ?? 0) + 1;
    if (labelLevel[f.size] === undefined) labelLevel[f.size] = f.index;
  });

  const framesMidY = layout.frames.length
    ? (layout.frames[0].bottom + layout.frames[layout.frames.length - 1].top) / 2
    : 1;

  const frameRef = useRef<Group>(null);
  const timberRef = useRef<Group>(null);

  return (
    <group>
      <group ref={frameRef}>
        {/* 1) base jacks */}
        <PosedPart stage={baseStage} maxStage={maxStage} explode={lift(baseStage)}>
          {COLUMNS.map(([x, z], ci) =>
            isPropInner ? (
              <PropInner key={ci} seg={layout.base} x={x} z={z} drag={baseDrag} interactive={interactive} />
            ) : (
              <FlatJack key={ci} seg={layout.base} x={x} z={z} drag={baseDrag} interactive={interactive} />
            ),
          )}
          {showLabels && (
            <Tag y={Math.max(0.28, layout.base.height / 2)} text={isPropInner ? 'Prop Inner' : 'Flat Jack'} sub="×4" />
          )}
        </PosedPart>

        {/* 2) each frame level (ladders + coupling collars) */}
        {layout.frames.map((f, i) => (
          <PosedPart key={f.index} stage={frameStages[i]} maxStage={maxStage} explode={lift(frameStages[i])}>
            <HFrame bottom={f.bottom} height={f.height} z={-hz} size={f.size} />
            <HFrame bottom={f.bottom} height={f.height} z={hz} size={f.size} />
            {i > 0 &&
              COLUMNS.map(([x, z], ci) => (
                <mesh key={`c${ci}`} position={[x, f.bottom, z]} castShadow>
                  <cylinderGeometry args={[DIMS.legRadius * 1.45, DIMS.legRadius * 1.45, 0.085, 18]} />
                  <meshStandardMaterial color="#9aa0a8" metalness={0.7} roughness={0.45} />
                </mesh>
              ))}
            {showLabels && labelLevel[f.size] === f.index && (
              <Tag y={f.bottom + f.height / 2} z={-hz - 0.05} text={`${sizeLabel(f.size)} Frame`} sub={`×${sizeCounts[f.size] * 2}`} />
            )}
          </PosedPart>
        ))}

        {/* 3) diagonal cross-braces (pulled aside in the explode view) */}
        <PosedPart stage={braceStage} maxStage={maxStage} explode={[1.25, braceStage * EXPLODE_MARGIN, 0]}>
          {layout.frames.map((f) =>
            [-hx, hx].map((x) => (
              <group key={`${f.index}-${x}`}>
                <Tube from={[x, f.bottom + 0.07, -hz]} to={[x, f.top - 0.07, hz]} radius={DIMS.crossBraceRadius} />
                <Tube from={[x, f.top - 0.07, -hz]} to={[x, f.bottom + 0.07, hz]} radius={DIMS.crossBraceRadius} />
              </group>
            )),
          )}
          {showLabels && <Tag y={framesMidY} text="Cross Brace" sub={`×${4 * layout.frames.length}`} />}
        </PosedPart>

        {/* 4) extensions slot over the frame legs */}
        {rocket && (
          <PosedPart stage={extStage} maxStage={maxStage} explode={lift(extStage)}>
            {COLUMNS.map(([x, z], ci) => (
              <Extension key={ci} x={x} z={z} bottom={rocket.bottom} top={rocket.top} legRadius={DIMS.legRadius} />
            ))}
            {showLabels && <Tag y={rocket.bottom + rocket.height / 2} text="Extension" sub="×4" />}
          </PosedPart>
        )}

        {/* 5) U-heads go on top */}
        <PosedPart stage={uHeadStage} maxStage={maxStage} explode={lift(uHeadStage)}>
          {COLUMNS.map(([x, z], ci) => (
            <UHead key={ci} seg={layout.uHead} x={x} z={z} drag={uHeadDrag} interactive={interactive} />
          ))}
          {showLabels && <Tag y={layout.uHead.bottom + layout.uHead.height / 2 + 0.1} text="U-Head" sub="×4" />}
        </PosedPart>

      </group>

      {/* Timber deck — present in Build/Explode (unlabelled, not a "frame component"
          for now), but faded out entirely in Pack so the ghosted FRAME reads cleanly. */}
      <group ref={timberRef}>
        {/* 6) bearers drop into the U-heads */}
        <PosedPart stage={bearerStage} maxStage={maxStage} explode={lift(bearerStage)}>
          {[-hx, hx].map((x) => (
            <Box key={x} position={[x, layout.bearer.bottom + layout.bearer.height / 2, 0]} size={[DIMS.bearerWidth, layout.bearer.height, DIMS.bearerSpan]} color={COLORS.bearer} />
          ))}
        </PosedPart>

        {/* 7) joists drop onto the bearers */}
        <PosedPart stage={joistStage} maxStage={maxStage} explode={lift(joistStage)}>
          {joistZs.map((z, i) => (
            <Box key={i} position={[0, layout.joist.bottom + layout.joist.height / 2, z]} size={[DIMS.joistSpan, layout.joist.height, DIMS.joistWidth]} color={COLORS.joist} />
          ))}
        </PosedPart>

        {/* 8) ply slides over the joists */}
        <PosedPart stage={plyStage} maxStage={maxStage} explode={lift(plyStage)}>
          <Box position={[0, layout.ply.bottom + layout.ply.height / 2, 0]} size={[DIMS.joistSpan + 0.08, layout.ply.height, DIMS.bearerSpan + 0.08]} color={COLORS.ply} />
        </PosedPart>
      </group>

      <GhostController groupRef={frameRef} />
      <GhostController groupRef={timberRef} minOpacity={0} />
      <SoffitPlane y={layout.soffitY} meetsTarget={meetsTarget} />
    </group>
  );
}
