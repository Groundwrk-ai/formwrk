/**
 * Storage-yard layout — the designated floor spot for each material type when
 * the assembly is "packed" away. This is the single source of truth for the
 * yard (the 3D <StorageYard> reads it), mirroring how BAY_QUANTITIES is shared.
 *
 * The capacities (~300 cross-braces, ~80 flat-jacks, …) are how a FULL real
 * container looks, not what one tower uses — they describe the stillage, not the
 * take-off. `inUse` flags whether the current configuration actually draws on
 * that material; only in-use containers are emitted (the yard shows what THIS
 * render needs, so it reads as that configuration's transport materials).
 *
 * Step 1 renders these as recognisable primitives; Step 2 refines the appearance
 * from the supplied stillage photos.
 */
import type { FrameConfig } from './configurations';

export type YardKind = 'frameStack' | 'steelStillage' | 'heavyCage' | 'timberStack';
export type YardContents =
  | 'frames'
  | 'braces'
  | 'extensions'
  | 'propInners'
  | 'flatJacks'
  | 'uHeads'
  | 'timber';

export interface YardContainer {
  id: string;
  kind: YardKind;
  contents: YardContents;
  label: string;
  /** Approx items a full container holds (illustrative, not a take-off). */
  capacity?: number;
  /** Frame size for a frameStack, e.g. '6ft'. */
  size?: string;
  /** Floor position [x, z] in metres. */
  pos: [number, number];
  /** Height (m) of the floating label above the floor (staggered to de-overlap). */
  labelY: number;
  /** Whether the current configuration actually uses this material. */
  inUse: boolean;
}

// A compact block off the tower's +X side: frames along the back, the kit in a
// 2-row × 3-col grid in front. Labels are staggered front-to-back so they don't
// pile up in screen space.
const X0 = 2.9; // first yard column, clear of the tower footprint
const DX = 1.95; // column spacing
const Z_FRAMES = -1.7; // back row: stacked frames
const Z_KIT_A = 0.1; // kit row A (mid)
const Z_KIT_B = 1.6; // kit row B (front)

const sizeLabel = (size: string): string => size.replace('ft', 'Ft');

/** The container layout for a configuration: frame stacks + the standard kit. */
export function computeYard(config: FrameConfig): YardContainer[] {
  const containers: YardContainer[] = [];

  // Back row — a strapped stack of frames for each distinct size used.
  const sizes = [...new Set(config.frames)];
  sizes.forEach((size, i) => {
    containers.push({
      id: `frames-${size}`,
      kind: 'frameStack',
      contents: 'frames',
      label: `${sizeLabel(size)} Frames`,
      size,
      pos: [X0 + i * DX, Z_FRAMES],
      labelY: 1.65,
      inUse: true,
    });
  });

  // The standard kit — steel stillages, heavy-duty cages and the timber stack —
  // laid out in two rows of three.
  const usesExtension = config.rocket !== 'none';
  const isPropInner = config.baseType === 'propInner';
  const kit: Array<Omit<YardContainer, 'pos' | 'labelY'>> = [
    { id: 'braces', kind: 'steelStillage', contents: 'braces', label: 'Cross Braces', capacity: 300, inUse: true },
    { id: 'extensions', kind: 'steelStillage', contents: 'extensions', label: 'Frame Extensions', capacity: 300, inUse: usesExtension },
    { id: 'propInners', kind: 'steelStillage', contents: 'propInners', label: 'Prop Inners', capacity: 60, inUse: isPropInner },
    { id: 'flatJacks', kind: 'heavyCage', contents: 'flatJacks', label: 'Flat Jacks', capacity: 80, inUse: !isPropInner },
    { id: 'uHeads', kind: 'heavyCage', contents: 'uHeads', label: 'U-Heads', capacity: 65, inUse: true },
    // Timber (LVL bearers/joists + Form-Ply) is intentionally NOT stored in the yard for now —
    // we are focusing on the frame components. `capacity` above is the per-container maximum each
    // storage type holds (kept for reference; not shown in the UI).
  ];
  // Only show containers for materials the current render actually uses — the yard
  // illustrates the real transport materials for this configuration (and will feed the
  // area-extrapolated materials list later). Unused containers are omitted, not dimmed,
  // and the remaining ones repack into the grid with no gaps.
  kit
    .filter((c) => c.inUse)
    .forEach((c, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3); // 0 = mid row, 1 = front row
      containers.push({
        ...c,
        pos: [X0 + col * DX, row === 0 ? Z_KIT_A : Z_KIT_B],
        labelY: row === 0 ? 1.35 : 1.15,
      });
    });

  return containers;
}
