/**
 * Global scene + configuration state (zustand).
 *
 * The Left Rail has two INDEPENDENT tools, selected by `panelMode`:
 *   - 'inputs': enter a target slab height + thickness → the tool picks a configuration
 *     and dials the screwjacks to the target.
 *   - 'custom': hand-build a frame set (no target) → the tool reports its height range.
 *
 * The two panels are fully independent workspaces. The fields the scene renders
 * (`config`, jacks, `slabThickness`, `viewMode`, …) always reflect the ACTIVE panel.
 * On a panel switch the active fields are snapshotted into the outgoing panel's slot
 * (`savedInputs` / `savedCustom`) and the incoming panel's snapshot is restored verbatim
 * (or its default on first visit). Nothing is shared between the two — changing the slab
 * thickness or the view in one panel never touches the other.
 *
 * Within Inputs, every mutation goes through the same resolver so two invariants hold:
 *   1. the active config is ALWAYS available for the current slab (a Prop Inner can never
 *      remain active on a thick slab), and
 *   2. derived `isValid` reflects BOTH slab availability and the height range.
 */

import { create } from 'zustand';
import { CONFIG_BY_ID, type FrameConfig, type BaseType } from '../logic/configurations';
import {
  calcHeightRange,
  currentHeight as calcCurrentHeight,
  isAvailableForSlab,
  allocateExtensionsToTarget,
  type HeightRange,
} from '../logic/heightCalc';
import { simplestValidConfig, simplestAvailableConfig } from '../logic/catalogue';
import { customConfigFrom, applySlot, EMPTY_SLOTS, type Slots } from '../logic/customBuild';
import { INPUT_LIMITS } from '../logic/frameData';

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/**
 * How the tower is presented in the 3D viewport:
 *  - 'assembled': the erected shoring tower (the default working view),
 *  - 'exploded':  every component type separated along the build axis + labelled,
 *  - 'packed':    the tower ghosted, with the materials shown stored in the yard.
 */
export type ViewMode = 'assembled' | 'exploded' | 'packed';

/**
 * Which Left-Rail panel is active:
 *  - 'inputs': enter a target slab height + thickness → the tool picks a configuration,
 *  - 'custom': hand-build a frame set (no target) → the tool reports its height range.
 */
export type PanelMode = 'inputs' | 'custom';

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

const EMPTY_RANGE: HeightRange = { min: 0, max: 0, uHeadMin: 0, uHeadMax: 0, baseMin: 0, baseMax: 0 };

/**
 * Resolve the full INPUTS assembly for a set of inputs:
 *  - prefer the simplest valid config for the height,
 *  - else keep the previous config IF it's still available for the slab,
 *  - else fall back to the simplest available config (never a prohibited one),
 * then ALLOCATE the screwjacks so the assembly is rendered adjusted to the target
 * soffit (clamped to the config's range). Manual drags afterward are preserved.
 */
function resolveInputs(slabHeight: number, slabThickness: number, prevConfig: FrameConfig) {
  const config =
    simplestValidConfig(slabHeight, slabThickness) ??
    (isAvailableForSlab(prevConfig, slabThickness)
      ? prevConfig
      : simplestAvailableConfig(slabThickness));
  const { uHeadExtension, baseExtension } = allocateExtensionsToTarget(config, slabThickness, slabHeight);
  return {
    slabHeight,
    slabThickness,
    config,
    uHeadExtension,
    baseExtension,
    towerVisible: true,
    ...derive(config, slabThickness, slabHeight, uHeadExtension, baseExtension),
  };
}

/**
 * Resolve the CUSTOM assembly from the current slot selections + slab thickness, seating
 * the jacks at `desiredUHead`/`desiredBase` (clamped to the config's range). While no
 * bottom frame is chosen the build is incomplete → `towerVisible = false` and the height
 * range reads empty; `fallbackConfig` is kept only so the (hidden) scene has something to
 * hold. Custom has no target height, so target-derived flags are set to safe values.
 */
function resolveCustom(
  frames: Slots,
  rocket: string,
  baseType: BaseType,
  slabThickness: number,
  desiredUHead: number,
  desiredBase: number,
  fallbackConfig: FrameConfig,
) {
  const config = customConfigFrom(frames, rocket, baseType, slabThickness);
  if (!config) {
    return {
      config: fallbackConfig,
      uHeadExtension: 0,
      baseExtension: 0,
      range: EMPTY_RANGE,
      currentHeight: 0,
      available: true,
      hasValidOption: false,
      isValid: false,
      meetsTarget: false,
      towerVisible: false,
    };
  }
  const range = calcHeightRange(config, slabThickness);
  const uHeadExtension = clamp(Math.round(desiredUHead), range.uHeadMin, range.uHeadMax);
  const baseExtension = clamp(Math.round(desiredBase), range.baseMin, range.baseMax);
  return {
    config,
    uHeadExtension,
    baseExtension,
    range,
    currentHeight: calcCurrentHeight(config, uHeadExtension, baseExtension),
    available: true,
    hasValidOption: true,
    isValid: true,
    meetsTarget: false,
    towerVisible: true,
  };
}

/** The full active-field set of one panel, saved when it's inactive. */
type PanelSnapshot = Derived & {
  slabHeight: number;
  slabThickness: number;
  config: FrameConfig;
  uHeadExtension: number;
  baseExtension: number;
  viewMode: ViewMode;
  towerVisible: boolean;
};

export interface FormworkState extends Derived {
  // Inputs
  slabHeight: number; // mm, floor to soffit
  slabThickness: number; // mm

  // Active configuration + live adjustable extensions (mm)
  config: FrameConfig;
  uHeadExtension: number;
  baseExtension: number;

  // Presentation
  viewMode: ViewMode;
  /** Which Left-Rail panel is active (Inputs vs Custom). */
  panelMode: PanelMode;
  /** Whether the assembly should render in the 3D scene (false while a custom build is incomplete). */
  towerVisible: boolean;

  // Custom-panel selections (bottom → top frame slots + extension/base choices). These
  // are the Custom panel's persistent selection; they survive switching to Inputs and back.
  customFrames: Slots;
  customRocket: string;
  customBaseType: BaseType;

  // Saved workspace of the INACTIVE panel, restored verbatim on switch-back (null = never
  // visited → use its default). The active panel's state lives in the flat fields above.
  savedInputs: PanelSnapshot | null;
  savedCustom: PanelSnapshot | null;

  // Actions
  setSlabHeight: (h: number) => void;
  setSlabThickness: (t: number) => void;
  /** Swap the whole configuration; coerced to an available one and clamped to its ranges. */
  setConfig: (config: FrameConfig) => void;
  setUHeadExtension: (v: number) => void;
  setBaseExtension: (v: number) => void;
  /** Re-pick the simplest valid config for the current inputs (no-op if none fits). */
  autoAssemble: () => void;
  /** Switch the viewport presentation (assembled / exploded / packed). */
  setViewMode: (mode: ViewMode) => void;
  /** Switch the Left-Rail panel (Inputs / Custom), swapping the whole workspace. */
  setPanelMode: (mode: PanelMode) => void;
  /** Set a custom frame slot (bottom=0), cascading away now-illegal slots above. */
  setCustomSlot: (index: number, size: string | null) => void;
  /** Set the custom extension choice ('none' | '300mm' | '500mm'). */
  setCustomRocket: (rocket: string) => void;
  /** Set the custom base choice ('flatJack' | 'propInner'). */
  setCustomBaseType: (baseType: BaseType) => void;
}

// Sensible defaults: 2800mm soffit, 200mm (thin) slab -> simplest valid = 6ft Flat Jack.
const DEFAULT_HEIGHT = 2800;
const DEFAULT_THICKNESS = 200;
const initialConfig = simplestValidConfig(DEFAULT_HEIGHT, DEFAULT_THICKNESS) ?? CONFIG_BY_ID['s-6ft-fj'];
const initialAlloc = allocateExtensionsToTarget(initialConfig, DEFAULT_THICKNESS, DEFAULT_HEIGHT);

/** Inputs default workspace — a 6ft Flat Jack dialled to 2800mm on a thin slab, Build view. */
const INPUTS_DEFAULT: PanelSnapshot = {
  slabHeight: DEFAULT_HEIGHT,
  slabThickness: DEFAULT_THICKNESS,
  config: initialConfig,
  uHeadExtension: initialAlloc.uHeadExtension,
  baseExtension: initialAlloc.baseExtension,
  viewMode: 'assembled',
  towerVisible: true,
  ...derive(initialConfig, DEFAULT_THICKNESS, DEFAULT_HEIGHT, initialAlloc.uHeadExtension, initialAlloc.baseExtension),
};

/** Custom default workspace — a blank build (nothing rendered) on a thin slab, Build view. */
const CUSTOM_DEFAULT: PanelSnapshot = {
  slabHeight: DEFAULT_HEIGHT,
  slabThickness: DEFAULT_THICKNESS,
  config: initialConfig, // placeholder; hidden while towerVisible is false
  uHeadExtension: 0,
  baseExtension: 0,
  viewMode: 'assembled',
  towerVisible: false,
  range: EMPTY_RANGE,
  currentHeight: 0,
  available: true,
  hasValidOption: false,
  isValid: false,
  meetsTarget: false,
};

/** Capture the active flat fields as this panel's saved workspace. */
const snapshot = (s: FormworkState): PanelSnapshot => ({
  slabHeight: s.slabHeight,
  slabThickness: s.slabThickness,
  config: s.config,
  uHeadExtension: s.uHeadExtension,
  baseExtension: s.baseExtension,
  viewMode: s.viewMode,
  towerVisible: s.towerVisible,
  range: s.range,
  currentHeight: s.currentHeight,
  available: s.available,
  hasValidOption: s.hasValidOption,
  isValid: s.isValid,
  meetsTarget: s.meetsTarget,
});

export const useFormworkStore = create<FormworkState>((set, get) => ({
  ...INPUTS_DEFAULT,
  panelMode: 'inputs',
  customFrames: EMPTY_SLOTS,
  customRocket: 'none',
  customBaseType: 'flatJack',
  savedInputs: null,
  savedCustom: null,

  setSlabHeight: (h) => {
    if (!Number.isFinite(h)) return; // reject NaN / Infinity
    const s = get();
    if (s.panelMode !== 'inputs') return; // slab height is an Inputs-only control
    const slabHeight = clamp(Math.round(h), 0, INPUT_LIMITS.slabHeightMax);
    set(resolveInputs(slabHeight, s.slabThickness, s.config));
  },

  // Each panel owns its own slab thickness; re-resolve only the active one.
  setSlabThickness: (t) => {
    if (!Number.isFinite(t)) return;
    const s = get();
    const slabThickness = clamp(Math.round(t), 0, INPUT_LIMITS.slabThicknessMax);
    if (s.panelMode === 'custom') {
      // Preserve the current jack positions (clamped to the new range).
      set({
        slabThickness,
        ...resolveCustom(s.customFrames, s.customRocket, s.customBaseType, slabThickness, s.uHeadExtension, s.baseExtension, s.config),
      });
    } else {
      set(resolveInputs(s.slabHeight, slabThickness, s.config));
    }
  },

  setConfig: (configArg) => {
    const s = get();
    if (s.panelMode !== 'inputs') return; // Custom builds via the frame slots, not whole-config swaps
    // Never activate a config that's prohibited for the current slab.
    const config = isAvailableForSlab(configArg, s.slabThickness)
      ? configArg
      : simplestAvailableConfig(s.slabThickness);
    // Render the newly-selected config adjusted to the target soffit.
    const { uHeadExtension, baseExtension } = allocateExtensionsToTarget(config, s.slabThickness, s.slabHeight);
    set({
      config,
      uHeadExtension,
      baseExtension,
      towerVisible: true,
      ...derive(config, s.slabThickness, s.slabHeight, uHeadExtension, baseExtension),
    });
  },

  setUHeadExtension: (v) => {
    if (!Number.isFinite(v)) return;
    const s = get();
    const uHeadExtension = clamp(Math.round(v), s.range.uHeadMin, s.range.uHeadMax);
    if (s.panelMode === 'custom') {
      // No target height in Custom — just update the live height; range/config are unchanged.
      set({ uHeadExtension, currentHeight: calcCurrentHeight(s.config, uHeadExtension, s.baseExtension) });
    } else {
      set({
        uHeadExtension,
        ...derive(s.config, s.slabThickness, s.slabHeight, uHeadExtension, s.baseExtension),
      });
    }
  },

  setBaseExtension: (v) => {
    if (!Number.isFinite(v)) return;
    const s = get();
    const baseExtension = clamp(Math.round(v), s.range.baseMin, s.range.baseMax);
    if (s.panelMode === 'custom') {
      set({ baseExtension, currentHeight: calcCurrentHeight(s.config, s.uHeadExtension, baseExtension) });
    } else {
      set({
        baseExtension,
        ...derive(s.config, s.slabThickness, s.slabHeight, s.uHeadExtension, baseExtension),
      });
    }
  },

  autoAssemble: () => {
    const s = get();
    const next = simplestValidConfig(s.slabHeight, s.slabThickness);
    if (next) get().setConfig(next);
  },

  setViewMode: (mode) => set({ viewMode: mode }),

  setPanelMode: (mode) => {
    const s = get();
    if (mode === s.panelMode) return;
    // Save the outgoing panel's workspace, restore the incoming one (default if unvisited).
    const snap = snapshot(s);
    const savedInputs = s.panelMode === 'inputs' ? snap : s.savedInputs;
    const savedCustom = s.panelMode === 'custom' ? snap : s.savedCustom;
    const restored = mode === 'custom' ? savedCustom ?? CUSTOM_DEFAULT : savedInputs ?? INPUTS_DEFAULT;
    set({ panelMode: mode, savedInputs, savedCustom, ...restored });
  },

  // Each custom build change reseats the jacks at minimum (Current = Min); the user then
  // drags/steppers up. customConfigFrom coerces any now-illegal extension/base.
  setCustomSlot: (index, size) => {
    const s = get();
    if (s.panelMode !== 'custom') return;
    const customFrames = applySlot(s.customFrames, index, size);
    set({ customFrames, ...resolveCustom(customFrames, s.customRocket, s.customBaseType, s.slabThickness, 0, 0, s.config) });
  },

  setCustomRocket: (rocket) => {
    const s = get();
    if (s.panelMode !== 'custom') return;
    set({ customRocket: rocket, ...resolveCustom(s.customFrames, rocket, s.customBaseType, s.slabThickness, 0, 0, s.config) });
  },

  setCustomBaseType: (baseType) => {
    const s = get();
    if (s.panelMode !== 'custom') return;
    set({ customBaseType: baseType, ...resolveCustom(s.customFrames, s.customRocket, baseType, s.slabThickness, 0, 0, s.config) });
  },
}));

// Dev-only hook for previewing arbitrary configs (e.g. short-frame triples that
// auto-assemble never selects). Tree-shaken out of production builds.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { __fw: unknown; __cfg: unknown }).__fw = useFormworkStore;
  (window as unknown as { __fw: unknown; __cfg: unknown }).__cfg = CONFIG_BY_ID;
}
