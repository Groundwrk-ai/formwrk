/**
 * One ladder frame in a single X-Y plane at depth z. The internal bracing
 * pattern depends on the frame size (matching the real product):
 *   - short frames (3ft, 4ft): a wide triangular brace + top/bottom rungs
 *   - tall frames (5/6/7ft):   two top rungs + a central hourglass "X" brace
 * The diagonal cross-bracing that forms the bay "X" lives BETWEEN the two
 * ladders (front + back) and is drawn by the Tower.
 */
import { Tube, DIMS } from './primitives';

interface BraceProps {
  hx: number;
  bottom: number;
  top: number;
  z: number;
}

function ShortBrace({ hx, bottom, top, z }: BraceProps) {
  const topRung = top - 0.05;
  const botRung = bottom + 0.06;
  const apex = top - 0.09; // V apex at top centre
  return (
    <>
      <Tube from={[-hx, topRung, z]} to={[hx, topRung, z]} radius={DIMS.braceRadius} />
      <Tube from={[-hx, botRung, z]} to={[hx, botRung, z]} radius={DIMS.braceRadius} />
      {/* triangular brace */}
      <Tube from={[-hx, botRung, z]} to={[0, apex, z]} radius={DIMS.braceRadius} />
      <Tube from={[hx, botRung, z]} to={[0, apex, z]} radius={DIMS.braceRadius} />
    </>
  );
}

function TallBrace({ hx, bottom, top, z }: BraceProps) {
  const topRung = top - 0.06;
  const botRung = bottom + 0.07;
  const waist = (topRung + botRung) / 2;
  return (
    <>
      {/* single top rung */}
      <Tube from={[-hx, topRung, z]} to={[hx, topRung, z]} radius={DIMS.braceRadius} />
      <Tube from={[-hx, botRung, z]} to={[hx, botRung, z]} radius={DIMS.braceRadius} />
      {/* hourglass X between the top rung and the bottom rung */}
      <Tube from={[-hx, topRung, z]} to={[hx, botRung, z]} radius={DIMS.braceRadius} />
      <Tube from={[hx, topRung, z]} to={[-hx, botRung, z]} radius={DIMS.braceRadius} />
      {/* waist rung at the crossing */}
      <Tube from={[-hx, waist, z]} to={[hx, waist, z]} radius={DIMS.braceRadius * 0.9} />
    </>
  );
}

export function HFrame({
  bottom,
  height,
  z,
  size,
}: {
  bottom: number;
  height: number;
  z: number;
  size: string;
}) {
  const hx = DIMS.legSpacing / 2;
  const top = bottom + height;
  const short = size === '3ft' || size === '4ft';

  return (
    <group>
      <Tube from={[-hx, bottom, z]} to={[-hx, top, z]} radius={DIMS.legRadius} />
      <Tube from={[hx, bottom, z]} to={[hx, top, z]} radius={DIMS.legRadius} />
      {short ? (
        <ShortBrace hx={hx} bottom={bottom} top={top} z={z} />
      ) : (
        <TallBrace hx={hx} bottom={bottom} top={top} z={z} />
      )}
    </group>
  );
}
