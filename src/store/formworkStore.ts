/**
 * Global scene + configuration state (zustand).
 *
 * Holds the slab inputs, the active configuration, and the live screwjack
 * extensions, plus derived height values. Every mutation goes through the same
 * resolver so two invariants always hold:
 *   1. the active config is ALWAYS available for the current slab (a Prop Inner
 *      can never remain active on a thick slab), and
 *   2. derived `isValid` reflects BOTH slab availability and the height range.
 * When nothing services the entered height we still keep a safe (available)
 * config active to render, and flag `hasValidOption = false` so the UI can say so.
 */

import { create } from 'zustand';
import { CONFIG_BY_ID, type FrameConfig } from '../logic/configurations';
import {
  calcHeightRange,
  currentHeight as calcCurrentHeight,
  isAvailableForSlab,
} from '../logic/heightCalc';
import { simplestValidConfig, simplestAvailableConfig } from '../logic/catalogue';
import { INPUT_LIMITS } from '../logic/frameData';

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

interface Derived {
  range: ReturnType<typeof calcHeightRange>;
  currentHeight: number;
  /** Active config is permitted for the current slab thickness. */
  available: boolean;
  /** Some configuration in the catalogue services the entered height. */
  hasValidOption: boolean;
  /** Target slab height falls within the active config's range AND it's available. */
  isValid: boolean;
  /** Live current height equals the target (within 2mm). */
  meetsTarget: boolean;
}

function derive(
  config: FrameConfig,
  slabThickness: number,
  slabHeight: number,
  uHeadExtension: number,
  baseExtension: number,
): Derived {
  const range = calcHeightRange(config, slabThickness);
  const currentHeight = calcCurrentHeight(config, uHeadExtension, baseExtension);
  const available = isAvailableForSlab(config, slabThickness);
  const hasValidOption = simplestValidConfig(slabHeight, slabThickness) !== null;
  return {
    range,
    currentHeight,
    available,
    hasValidOption,
    isValid: available && slabHeight >= range.min && slabHeight <= range.max,
    meetsTarget: Math.abs(currentHeight - slabHeight) <= 2,
  };
}

/**
 * Resolve the full assembly state for a set of inputs:
 *  - prefer the simplest valid config for the height,
 *  - else keep the previous config IF it's still available for the slab,
 *  - else fall back to the simplest available config (never a prohibited one),
 * then clamp the screwjack extensions to the chosen config's ranges.
 */
function resolveAssembly(
  slabHeight: number,
  slabThickness: number,
  prevConfig: FrameConfig,
  prevUHead: number,
  prevBase: number,
) {
  const config =
    simplestValidConfig(slabHeight, slabThickness) ??
    (isAvailableForSlab(prevConfig, slabThickness)
      ? prevConfig
      : simplestAvailableConfig(slabThickness));
  const range = calcHeightRange(config, slabThickness);
  const uHeadExtension = clamp(prevUHead, range.uHeadMin, range.uHeadMax);
  const baseExtension = clamp(prevBase, range.baseMin, range.baseMax);
  return {
    slabHeight,
    slabThickness,
    config,
    uHeadExtension,
    baseExtension,
    ...derive(config, slabThickness, slabHeight, uHeadExtension, baseExtension),
  };
}

export interface FormworkState extends Derived {
  // Inputs
  slabHeight: number; // mm, floor to soffit
  slabThickness: number; // mm

  // Active configuration + live adjustable extensions (mm)
  config: FrameConfig;
  uHeadExtension: number;
  baseExtension: number;

  // Actions
  setSlabHeight: (h: number) => void;
  setSlabThickness: (t: number) => void;
  /** Swap the whole configuration; coerced to an available one and clamped to its ranges. */
  setConfig: (config: FrameConfig) => void;
  setUHeadExtension: (v: number) => void;
  setBaseExtension: (v: number) => void;
  /** Re-pick the simplest valid config for the current inputs (no-op if none fits). */
  autoAssemble: () => void;
}

// Sensible defaults: 2800mm soffit, 200mm (thin) slab -> simplest valid = 6ft Flat Jack.
const DEFAULT_HEIGHT = 2800;
const DEFAULT_THICKNESS = 200;
const initialConfig = simplestValidConfig(DEFAULT_HEIGHT, DEFAULT_THICKNESS) ?? CONFIG_BY_ID['s-6ft-fj'];
const initialRange = calcHeightRange(initialConfig, DEFAULT_THICKNESS);

export const useFormworkStore = create<FormworkState>((set, get) => ({
  slabHeight: DEFAULT_HEIGHT,
  slabThickness: DEFAULT_THICKNESS,
  config: initialConfig,
  uHeadExtension: initialRange.uHeadMin,
  baseExtension: initialRange.baseMin,
  ...derive(initialConfig, DEFAULT_THICKNESS, DEFAULT_HEIGHT, initialRange.uHeadMin, initialRange.baseMin),

  setSlabHeight: (h) => {
    if (!Number.isFinite(h)) return; // reject NaN / Infinity
    const s = get();
    const slabHeight = clamp(Math.round(h), 0, INPUT_LIMITS.slabHeightMax);
    set(resolveAssembly(slabHeight, s.slabThickness, s.config, s.uHeadExtension, s.baseExtension));
  },

  setSlabThickness: (t) => {
    if (!Number.isFinite(t)) return;
    const s = get();
    const slabThickness = clamp(Math.round(t), 0, INPUT_LIMITS.slabThicknessMax);
    set(resolveAssembly(s.slabHeight, slabThickness, s.config, s.uHeadExtension, s.baseExtension));
  },

  setConfig: (configArg) => {
    const s = get();
    // Never activate a config that's prohibited for the current slab.
    const config = isAvailableForSlab(configArg, s.slabThickness)
      ? configArg
      : simplestAvailableConfig(s.slabThickness);
    const range = calcHeightRange(config, s.slabThickness);
    const uHeadExtension = clamp(s.uHeadExtension, range.uHeadMin, range.uHeadMax);
    const baseExtension = clamp(s.baseExtension, range.baseMin, range.baseMax);
    set({
      config,
      uHeadExtension,
      baseExtension,
      ...derive(config, s.slabThickness, s.slabHeight, uHeadExtension, baseExtension),
    });
  },

  setUHeadExtension: (v) => {
    if (!Number.isFinite(v)) return;
    const s = get();
    const uHeadExtension = clamp(Math.round(v), s.range.uHeadMin, s.range.uHeadMax);
    set({
      uHeadExtension,
      ...derive(s.config, s.slabThickness, s.slabHeight, uHeadExtension, s.baseExtension),
    });
  },

  setBaseExtension: (v) => {
    if (!Number.isFinite(v)) return;
    const s = get();
    const baseExtension = clamp(Math.round(v), s.range.baseMin, s.range.baseMax);
    set({
      baseExtension,
      ...derive(s.config, s.slabThickness, s.slabHeight, s.uHeadExtension, baseExtension),
    });
  },

  autoAssemble: () => {
    const s = get();
    const next = simplestValidConfig(s.slabHeight, s.slabThickness);
    if (next) get().setConfig(next);
  },
}));

// Dev-only hook for previewing arbitrary configs (e.g. short-frame triples that
// auto-assemble never selects). Tree-shaken out of production builds.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { __fw: unknown; __cfg: unknown }).__fw = useFormworkStore;
  (window as unknown as { __fw: unknown; __cfg: unknown }).__cfg = CONFIG_BY_ID;
}
