/**
 * Vertical layout of the assembly, in METRES, for the 3D scene.
 *
 * Decision: geometry is TRUTHFUL TO THE CALC. The timber stack uses the
 * spreadsheet's vertical contributions (bearer 150 + joists 100 + ply 17 = 267mm),
 * NOT the realistic LVL cross-sections, so the rendered tower's top (ply surface)
 * sits exactly at `currentHeight`. The ghost soffit plane sits at `slabHeight`;
 * the two meet when the configuration is dialled to the target.
 *
 * Build order bottom -> top:
 *   ground -> base (flat jack / prop inner) -> frame stack -> rocket -> U-head ->
 *   bearer -> joists -> ply  (top of ply == currentHeight)
 */

import type { FrameConfig } from './configurations';
import { FRAME_HEIGHTS, ROCKETS, TIMBER } from './frameData';
import { currentHeight } from './heightCalc';

/** mm -> m */
export const m = (mm: number): number => mm / 1000;

export interface Segment {
  /** bottom Y in metres */
  bottom: number;
  /** top Y in metres */
  top: number;
  /** height in metres */
  height: number;
}

export interface FrameSegment extends Segment {
  size: string; // '3ft'..'7ft'
  index: number; // 0 = bottom frame
}

export interface AssemblyLayout {
  base: Segment; // adjustable base (flat jack rod / prop inner tube)
  frames: FrameSegment[];
  rocket: Segment | null;
  uHead: Segment; // threaded rod of the U-head
  bearer: Segment;
  joist: Segment;
  ply: Segment;
  /** Y of the target soffit (slab underside) = slabHeight. */
  soffitY: number;
  /** Y of the top of the ply == currentHeight (live assembled height). */
  topY: number;
  /** Whether the assembled top currently meets the target (within tolerance). */
  meetsTarget: boolean;
}

export interface LayoutInputs {
  config: FrameConfig;
  uHeadExtension: number; // mm
  baseExtension: number; // mm
  slabHeight: number; // mm (floor to soffit)
}

const seg = (bottomM: number, heightMm: number): Segment => {
  const height = m(heightMm);
  return { bottom: bottomM, top: bottomM + height, height };
};

/** Compute the full vertical layout (metres) for the current configuration + extensions. */
export function computeLayout({ config, uHeadExtension, baseExtension, slabHeight }: LayoutInputs): AssemblyLayout {
  const base = seg(0, baseExtension);

  // Stack largest frame at the bottom, smallest at the top (visual/erection
  // order). The height sum is order-independent, so this only affects rendering.
  const stacked = [...config.frames].sort((a, b) => (FRAME_HEIGHTS[b] ?? 0) - (FRAME_HEIGHTS[a] ?? 0));
  const frames: FrameSegment[] = [];
  let cursor = base.top;
  stacked.forEach((size, index) => {
    const h = m(FRAME_HEIGHTS[size] ?? 0);
    frames.push({ bottom: cursor, top: cursor + h, height: h, size, index });
    cursor += h;
  });

  const rocketMm = ROCKETS[config.rocket] ?? 0;
  const rocket = rocketMm > 0 ? seg(cursor, rocketMm) : null;
  if (rocket) cursor = rocket.top;

  const uHead = seg(cursor, uHeadExtension);
  const bearer = seg(uHead.top, TIMBER.bearer);
  const joist = seg(bearer.top, TIMBER.joists);
  const ply = seg(joist.top, TIMBER.ply);

  const topY = m(currentHeight(config, uHeadExtension, baseExtension));
  const soffitY = m(slabHeight);

  return {
    base,
    frames,
    rocket,
    uHead,
    bearer,
    joist,
    ply,
    soffitY,
    topY,
    meetsTarget: Math.abs(topY - soffitY) <= m(2), // within 2mm
  };
}
