/** One H-frame (two legs + top/mid braces + X-bracing) in a single X-Y plane at depth z. */
import { Tube, DIMS } from './primitives';

export function HFrame({ bottom, height, z }: { bottom: number; height: number; z: number }) {
  const hx = DIMS.legSpacing / 2;
  const top = bottom + height;
  const mid = bottom + height / 2;
  const inset = Math.min(0.08, height * 0.1);

  return (
    <group>
      {/* vertical legs */}
      <Tube from={[-hx, bottom, z]} to={[-hx, top, z]} radius={DIMS.legRadius} />
      <Tube from={[hx, bottom, z]} to={[hx, top, z]} radius={DIMS.legRadius} />
      {/* top + mid horizontal braces */}
      <Tube from={[-hx, top - 0.03, z]} to={[hx, top - 0.03, z]} radius={DIMS.braceRadius} />
      <Tube from={[-hx, mid, z]} to={[hx, mid, z]} radius={DIMS.braceRadius} />
      {/* X-bracing */}
      <Tube from={[-hx, bottom + inset, z]} to={[hx, top - inset, z]} radius={DIMS.braceRadius} />
      <Tube from={[hx, bottom + inset, z]} to={[-hx, top - inset, z]} radius={DIMS.braceRadius} />
    </group>
  );
}
