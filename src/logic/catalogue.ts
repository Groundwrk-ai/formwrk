/**
 * Catalogue queries layered on top of the calc engine:
 *   - which configs apply to a slab,
 *   - which are valid for given inputs,
 *   - the "simplest" valid config (auto-assemble recommendation),
 *   - snap-to-catalogue option filtering for the palette.
 */

import { CONFIGURATIONS, type FrameConfig, type BaseType } from './configurations';
import { FRAME_HEIGHTS } from './frameData';
import { framesTotal, isAvailableForSlab, isConfigValidForInputs } from './heightCalc';

/** All configs usable for a slab thickness (drops Prop Inner when thick). */
export function configsForSlab(slabThickness: number): FrameConfig[] {
  return CONFIGURATIONS.filter((c) => isAvailableForSlab(c, slabThickness));
}

/** Configs whose serviceable range contains the target slab height. */
export function validConfigsForInputs(slabHeight: number, slabThickness: number): FrameConfig[] {
  return CONFIGURATIONS.filter((c) => isConfigValidForInputs(c, slabHeight, slabThickness));
}

/**
 * Simplicity class rank, per sheet note 84:
 *   FJ no-ext (0) → FJ + ext (1) → PI no-ext (2) → PI + ext (3).
 */
function classRank(c: FrameConfig): number {
  const hasExt = c.rocket !== 'none';
  return c.baseType === 'flatJack' ? (hasExt ? 1 : 0) : hasExt ? 3 : 2;
}

/**
 * Total ordering for "simplest" (lower = simpler):
 *   1) fewest frames (single < double < triple)
 *   2) class rank (FJ no-ext < FJ+ext < PI no-ext < PI+ext)
 *   3) smaller frames first (by total frame height)
 *   4) id, as a stable final tie-break
 */
export function compareSimplicity(a: FrameConfig, b: FrameConfig): number {
  return (
    a.frames.length - b.frames.length ||
    classRank(a) - classRank(b) ||
    framesTotal(a.frames) - framesTotal(b.frames) ||
    a.id.localeCompare(b.id)
  );
}

/** The single simplest valid config for the inputs, or null if none fits. */
export function simplestValidConfig(slabHeight: number, slabThickness: number): FrameConfig | null {
  const valid = validConfigsForInputs(slabHeight, slabThickness);
  if (valid.length === 0) return null;
  return valid.slice().sort(compareSimplicity)[0];
}

/** Valid configs sorted simplest-first (for ranking the palette / showing alternatives). */
export function validConfigsRanked(slabHeight: number, slabThickness: number): FrameConfig[] {
  return validConfigsForInputs(slabHeight, slabThickness).slice().sort(compareSimplicity);
}

// ---------------------------------------------------------------------------
// Snap-to-catalogue palette support
// ---------------------------------------------------------------------------

export interface PartialSelection {
  /** Frame stack so far (exact order). */
  frames?: string[];
  rocket?: string;
  baseType?: BaseType;
}

/** A frame stack identity string, e.g. ['5ft','6ft'] -> '5ft+6ft'. */
export const frameKey = (frames: string[]): string => frames.join('+');

function matchesPartial(c: FrameConfig, sel: PartialSelection): boolean {
  if (sel.frames && frameKey(sel.frames) !== frameKey(c.frames)) return false;
  if (sel.rocket !== undefined && c.rocket !== sel.rocket) return false;
  if (sel.baseType !== undefined && c.baseType !== sel.baseType) return false;
  return true;
}

const uniq = <T,>(xs: T[]): T[] => [...new Set(xs)];

/**
 * Given a partial selection + slab thickness, return the option values on each
 * axis that keep the assembly inside the 27-config catalogue. This is what makes
 * the palette "snap to catalogue": only offer choices that can complete to a real config.
 */
export function validOptions(sel: PartialSelection, slabThickness: number) {
  const pool = configsForSlab(slabThickness).filter((c) => matchesPartial(c, sel));
  return {
    frameStacks: uniq(pool.map((c) => frameKey(c.frames))),
    rockets: uniq(pool.map((c) => c.rocket)),
    baseTypes: uniq(pool.map((c) => c.baseType)),
    configs: pool,
  };
}

/** Frame sizes (single-frame additions) that can begin/extend a valid stack. */
export function availableFrameSizes(): string[] {
  return Object.keys(FRAME_HEIGHTS);
}
