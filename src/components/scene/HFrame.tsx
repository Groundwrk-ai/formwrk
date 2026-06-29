/**
 * One Royal-60 ladder frame in a single X-Y plane at depth z:
 * two vertical legs, two horizontal rungs, and a welded V-brace.
 * The diagonal cross-bracing that forms the big "X" lives BETWEEN the two
 * ladders (front + back) and is drawn by the Tower, matching the real system.
 */
import { Tube, DIMS } from './primitives';

export function HFrame({ bottom, height, z }: { bottom: number; height: number; z: number }) {
  const hx = DIMS.legSpacing / 2;
  const top = bottom + height;
  const rungMid = bottom + height * 0.52;
  const rungTop = top - 0.04;
  const vApex = bottom + 0.06;
  const vArms = bottom + height * 0.5;

  return (
    <group>
      {/* vertical legs */}
      <Tube from={[-hx, bottom, z]} to={[-hx, top, z]} radius={DIMS.legRadius} />
      <Tube from={[hx, bottom, z]} to={[hx, top, z]} radius={DIMS.legRadius} />
      {/* horizontal rungs */}
      <Tube from={[-hx, rungMid, z]} to={[hx, rungMid, z]} radius={DIMS.braceRadius} />
      <Tube from={[-hx, rungTop, z]} to={[hx, rungTop, z]} radius={DIMS.braceRadius} />
      {/* welded V-brace (apex low centre, arms up to the legs) */}
      <Tube from={[0, vApex, z]} to={[-hx, vArms, z]} radius={DIMS.braceRadius} />
      <Tube from={[0, vApex, z]} to={[hx, vArms, z]} radius={DIMS.braceRadius} />
    </group>
  );
}
