/**
 * Global scene + configuration state (zustand).
 *
 * Holds the slab inputs, the active configuration, and the live screwjack
 * extensions, plus derived height values. All derived fields are recomputed
 * through `recompute()` after every mutation so the engine stays the single
 * source of truth and the 3D scene + height panel never drift out of sync.
 */

import { create } from 'zustand';
import { CONFIG_BY_ID, type FrameConfig } from '../logic/configurations';
import { calcHeightRange, currentHeight as calcCurrentHeight } from '../logic/heightCalc';
import { simplestValidConfig } from '../logic/catalogue';

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

interface Derived {
  range: ReturnType<typeof calcHeightRange>;
  currentHeight: number;
  isValid: boolean; // target slab height falls within the config's range
  meetsTarget: boolean; // live current height == target (within 2mm)
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
  return {
    range,
    currentHeight,
    isValid: slabHeight >= range.min && slabHeight <= range.max,
    meetsTarget: Math.abs(currentHeight - slabHeight) <= 2,
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
  /** Swap the whole configuration (palette / auto-assemble); clamps extensions to new ranges. */
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
    const s = get();
    const slabHeight = Math.max(0, Math.round(h));
    // Auto-assemble the simplest valid config for the new target.
    const next = simplestValidConfig(slabHeight, s.slabThickness) ?? s.config;
    const range = calcHeightRange(next, s.slabThickness);
    const uHeadExtension = clamp(s.uHeadExtension, range.uHeadMin, range.uHeadMax);
    const baseExtension = clamp(s.baseExtension, range.baseMin, range.baseMax);
    set({
      slabHeight,
      config: next,
      uHeadExtension,
      baseExtension,
      ...derive(next, s.slabThickness, slabHeight, uHeadExtension, baseExtension),
    });
  },

  setSlabThickness: (t) => {
    const s = get();
    const slabThickness = Math.max(0, Math.round(t));
    // Prop Inner is unavailable for thick slabs; auto-assemble keeps us legal.
    const next = simplestValidConfig(s.slabHeight, slabThickness) ?? s.config;
    const range = calcHeightRange(next, slabThickness);
    const uHeadExtension = clamp(s.uHeadExtension, range.uHeadMin, range.uHeadMax);
    const baseExtension = clamp(s.baseExtension, range.baseMin, range.baseMax);
    set({
      slabThickness,
      config: next,
      uHeadExtension,
      baseExtension,
      ...derive(next, slabThickness, s.slabHeight, uHeadExtension, baseExtension),
    });
  },

  setConfig: (config) => {
    const s = get();
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
    const s = get();
    const uHeadExtension = clamp(Math.round(v), s.range.uHeadMin, s.range.uHeadMax);
    set({
      uHeadExtension,
      ...derive(s.config, s.slabThickness, s.slabHeight, uHeadExtension, s.baseExtension),
    });
  },

  setBaseExtension: (v) => {
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
