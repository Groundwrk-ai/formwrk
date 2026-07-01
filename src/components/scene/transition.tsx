/**
 * View-mode transition engine.
 *
 * One GSAP-driven `Driver` is shared (via context) by every animated part and
 * the ghost / yard / label controllers. Each view mode is a set of four scalar
 * weights; a transition lerps those weights from the previous mode to the next
 * over a single eased timeline:
 *
 *   weight    assembled  exploded  packed
 *   explode       0          1        0     ← how far parts sit from their built spot
 *   ghost         0          0        1     ← how translucent the tower is
 *   yard          0          0        1     ← how present the storage yard is
 *   label         0          1        0     ← whether the exploded labels show
 *
 * Because the packed pose == the assembled pose, packed parts don't move — the
 * tower simply ghosts out while the yard fades in. Only the exploded view moves
 * parts, so no geometry needed re-authoring; each part is wrapped as-is and its
 * group is offset by `explode * weight`.
 *
 * The transition is driven imperatively in useFrame (no React re-renders), and
 * re-fires on config changes too, so the staggered ground-up "build" still plays
 * whenever the assembly changes.
 */
import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  type ReactNode,
  type MutableRefObject,
} from 'react';
import { useFrame } from '@react-three/fiber';
import gsap from 'gsap';
import type { Group, Mesh, Material, MeshStandardMaterial } from 'three';
import { useFormworkStore, type ViewMode } from '../../store/formworkStore';

export interface ModeWeights {
  explode: number;
  ghost: number;
  yard: number;
  label: number;
}

export const MODE_WEIGHTS: Record<ViewMode, ModeWeights> = {
  assembled: { explode: 0, ghost: 0, yard: 0, label: 0 },
  exploded: { explode: 1, ghost: 0, yard: 0, label: 1 },
  packed: { explode: 0, ghost: 1, yard: 1, label: 0 },
};

export interface Driver {
  /** Weights at the start of the current transition. */
  from: ModeWeights;
  /** Weights being animated toward. */
  to: ModeWeights;
  /** The mode being animated toward (drives the build-drop on assemble). */
  toMode: ViewMode;
  /** Linear 0..1 progress of the current transition (eased at read time). */
  t: number;
}

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - clamp01(t), 3);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const mix = (a: ModeWeights, b: ModeWeights, t: number): ModeWeights => ({
  explode: lerp(a.explode, b.explode, t),
  ghost: lerp(a.ghost, b.ghost, t),
  yard: lerp(a.yard, b.yard, t),
  label: lerp(a.label, b.label, t),
});

/** The smoothly-eased weights at the current instant (no per-part stagger). */
export const sampleWeights = (d: Driver): ModeWeights => mix(d.from, d.to, easeOutCubic(d.t));

// ---------------------------------------------------------------------------

export const TRANSITION_SECONDS = 0.95;
/** The build (assemble) plays slower and more deliberately than explode/pack. */
export const BUILD_SECONDS = 2.4;
/** Fraction of the timeline spent fanning parts in/out in build order. */
const STAGGER = 0.42;
/** Extra drop (metres) parts fall through as they settle into the assembled pose. */
const DROP = 0.28;
/** How translucent tower materials become when fully ghosted. */
export const GHOST_OPACITY = 0.32; // alpha-hash stipple density for the ghost

const TransitionCtx = createContext<{ driver: MutableRefObject<Driver> } | null>(null);

export function useTransition() {
  const ctx = useContext(TransitionCtx);
  if (!ctx) throw new Error('useTransition must be used inside <TransitionProvider>');
  return ctx;
}

/**
 * Owns the shared driver and (re)starts the transition whenever the view mode
 * or the configuration changes. Snapshots the live weights at the moment of
 * change so rapid mode switches blend smoothly instead of snapping.
 */
export function TransitionProvider({ children }: { children: ReactNode }) {
  const driver = useRef<Driver>({
    from: MODE_WEIGHTS.assembled,
    to: MODE_WEIGHTS.assembled,
    toMode: 'assembled',
    t: 1,
  });
  const viewMode = useFormworkStore((s) => s.viewMode);
  const configId = useFormworkStore((s) => s.config.id);

  useLayoutEffect(() => {
    const d = driver.current;
    d.from = sampleWeights(d); // blend from wherever we currently are
    d.to = MODE_WEIGHTS[viewMode];
    d.toMode = viewMode;
    d.t = 0;
    // The assemble ("Build") plays slower; explode/pack are snappier.
    const duration = viewMode === 'assembled' ? BUILD_SECONDS : TRANSITION_SECONDS;
    const tw = gsap.to(d, { t: 1, duration, ease: 'none' });
    return () => {
      tw.kill();
    };
  }, [viewMode, configId]);

  return <TransitionCtx.Provider value={{ driver }}>{children}</TransitionCtx.Provider>;
}

/**
 * Wraps one logical part. The part's geometry is left exactly as authored (in
 * world coordinates); this group only offsets it by `explode * weight` and, when
 * settling into the assembled pose, drops it the last few centimetres so the
 * build reads as a ground-up assembly. `stage` orders the per-part stagger.
 */
export function PosedPart({
  stage,
  maxStage,
  explode,
  children,
}: {
  stage: number;
  maxStage: number;
  explode: [number, number, number];
  children: ReactNode;
}) {
  const { driver } = useTransition();
  const ref = useRef<Group>(null);
  const delay = maxStage > 0 ? STAGGER * (stage / maxStage) : 0;
  const span = 1 - STAGGER;

  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const d = driver.current;
    const local = easeOutCubic((d.t - delay) / span);
    const w = mix(d.from, d.to, local);
    g.position.x = explode[0] * w.explode;
    g.position.z = explode[2] * w.explode;
    let y = explode[1] * w.explode;
    if (d.toMode === 'assembled') y += DROP * (1 - local);
    g.position.y = y;
  });

  return <group ref={ref}>{children}</group>;
}

/**
 * Fades every MeshStandardMaterial under `groupRef` toward `minOpacity` as the
 * tower ghosts (packed mode). The frame uses GHOST_OPACITY (a faint ghost); the
 * timber deck passes minOpacity=0 so it disappears entirely in Pack. Grab-handle
 * (MeshBasicMaterial) helpers and the storage yard (a separate group) are left
 * untouched.
 */
export function GhostController({
  groupRef,
  minOpacity = GHOST_OPACITY,
}: {
  groupRef: MutableRefObject<Group | null>;
  minOpacity?: number;
}) {
  const { driver } = useTransition();
  const wasActive = useRef(false);

  useFrame(() => {
    const root = groupRef.current;
    if (!root) return;
    const ghost = sampleWeights(driver.current).ghost;
    const active = ghost >= 0.001;
    if (!active && !wasActive.current) return; // nothing to do while fully solid

    const opacity = lerp(1, minOpacity, ghost);
    // When a group fades all the way out (timber in Pack), hide it outright so it
    // can't read as a solid slab; otherwise keep it visible at the eased opacity.
    root.visible = !active || opacity > 0.02;
    const toggled = active !== wasActive.current; // alpha-hash flips → recompile once
    root.traverse((obj) => {
      const mat = (obj as Mesh).material as Material | Material[] | undefined;
      if (!mat) return;
      const mats = Array.isArray(mat) ? mat : [mat];
      for (const raw of mats) {
        const mm = raw as MeshStandardMaterial;
        if (!mm.isMeshStandardMaterial) continue;
        // Remember the original PBR values once, so we can restore them.
        const ud = mm.userData as { gMet?: number; gRough?: number; gEnv?: number };
        if (ud.gMet === undefined) {
          ud.gMet = mm.metalness;
          ud.gRough = mm.roughness;
          ud.gEnv = mm.envMapIntensity;
        }
        // Order-independent transparency: render the ghost in the OPAQUE pass with
        // alpha-to-coverage, so each pixel shows exactly ONE surface (depth-tested) —
        // no stacked-alpha where tubes overlap. Uses the canvas MSAA samples, so it's
        // smoother than a 1-bit alpha hash. `opacity` becomes the coverage.
        mm.alphaToCoverage = active;
        mm.transparent = false;
        mm.opacity = active ? opacity : 1;
        mm.depthWrite = true;
        if (toggled) mm.needsUpdate = true;
        // Flatten to matte as it ghosts so metallic highlights / reflections don't
        // make some tubes read "solid" — the ghost stays one even shell.
        mm.metalness = lerp(ud.gMet ?? 0, 0, ghost);
        mm.roughness = lerp(ud.gRough ?? 1, 1, ghost);
        mm.envMapIntensity = lerp(ud.gEnv ?? 1, 0, ghost);
      }
    });
    wasActive.current = active;
  });

  return null;
}
