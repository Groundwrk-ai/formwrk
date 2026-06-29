/**
 * Core height calculation — replicates the spreadsheet's min/max logic exactly.
 *
 *   Min = FramesTotal + Rocket + FIXED_TIMBER + U_HEAD.min + BaseMin
 *   Max = FramesTotal + Rocket + FIXED_TIMBER + uHeadMax   + baseMax
 *
 * where uHeadMax / baseMax depend on slab thickness and frame count (see below).
 * Sheet note 100/101: Min/Max formula. Verified against every config in the sheet.
 */

import type { FrameConfig } from './configurations';
import {
  FRAME_HEIGHTS,
  ROCKETS,
  FIXED_TIMBER,
  U_HEAD,
  FLAT_JACK,
  PROP_INNER,
  SLAB_THRESHOLD,
} from './frameData';

export interface HeightRange {
  min: number;
  max: number;
  uHeadMin: number;
  uHeadMax: number;
  baseMin: number;
  baseMax: number;
}

/** Slab is "thick" at or above the threshold (>= 221mm). */
export function isThickSlab(slabThickness: number): boolean {
  return slabThickness >= SLAB_THRESHOLD;
}

/** Sum of frame heights in mm. */
export function framesTotal(frames: string[]): number {
  return frames.reduce((sum, f) => sum + (FRAME_HEIGHTS[f] ?? 0), 0);
}

/** U-Head maximum extension for a config + slab thickness (mm). */
export function uHeadMaxFor(config: FrameConfig, slabThickness: number): number {
  if (!isThickSlab(slabThickness)) return U_HEAD.maxThin; // 500 — thin single/double/triple
  return config.frames.length === 1 ? U_HEAD.maxThickSingle : U_HEAD.maxThickMulti; // 450 / 300
}

/** Base (Flat Jack or Prop Inner) min/max for a config + slab thickness (mm). */
export function baseRangeFor(config: FrameConfig, slabThickness: number): { min: number; max: number } {
  if (config.baseType === 'propInner') {
    return { min: PROP_INNER.min, max: PROP_INNER.max }; // 300 / 1050 (thin only)
  }
  return { min: FLAT_JACK.min, max: isThickSlab(slabThickness) ? FLAT_JACK.maxThick : FLAT_JACK.maxThin };
}

/** Full serviceable height range for a config at a given slab thickness. */
export function calcHeightRange(config: FrameConfig, slabThickness: number): HeightRange {
  const fixedBelowJacks = framesTotal(config.frames) + (ROCKETS[config.rocket] ?? 0) + FIXED_TIMBER;
  const uHeadMax = uHeadMaxFor(config, slabThickness);
  const base = baseRangeFor(config, slabThickness);

  return {
    min: fixedBelowJacks + U_HEAD.min + base.min,
    max: fixedBelowJacks + uHeadMax + base.max,
    uHeadMin: U_HEAD.min,
    uHeadMax,
    baseMin: base.min,
    baseMax: base.max,
  };
}

/** Prop Inner is unavailable for thick slabs; everything else is always available. */
export function isAvailableForSlab(config: FrameConfig, slabThickness: number): boolean {
  return !(isThickSlab(slabThickness) && config.baseType === 'propInner');
}

/** True if slabHeight (floor-to-soffit) falls within this config's range for the inputs. */
export function isConfigValidForInputs(
  config: FrameConfig,
  slabHeight: number,
  slabThickness: number,
): boolean {
  if (!isAvailableForSlab(config, slabThickness)) return false;
  const { min, max } = calcHeightRange(config, slabThickness);
  return slabHeight >= min && slabHeight <= max;
}

/**
 * Live assembled height given the current adjustable screwjack extensions (mm).
 * This is what the 3D tower renders to and what the height panel shows as "Current".
 */
export function currentHeight(config: FrameConfig, uHeadExtension: number, baseExtension: number): number {
  return framesTotal(config.frames) + (ROCKETS[config.rocket] ?? 0) + FIXED_TIMBER + uHeadExtension + baseExtension;
}
