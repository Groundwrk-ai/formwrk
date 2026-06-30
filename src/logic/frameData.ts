/**
 * All formwork constants.
 *
 * SOURCE OF TRUTH: Formwork_Material_Selection_v2.xlsx, sheet "Mat. Selection (Draft)".
 * Cell references are noted inline so every magic number is traceable to the spreadsheet.
 * The spreadsheet is non-negotiable: if it changes, change these constants to match.
 */

/** Shoring-frame nominal heights, in mm. Sheet E9:E13. */
export const FRAME_HEIGHTS: Record<string, number> = {
  '3ft': 915, // E9
  '4ft': 1219, // E10
  '5ft': 1523, // E11
  '6ft': 1830, // E12
  '7ft': 2134, // E13
};

/** Frame-leg extension tubes, in mm. Sheet D16:D17. */
export const ROCKETS: Record<string, number> = {
  none: 0,
  '300mm': 300, // D16
  '500mm': 500, // D17
};

/** Fixed formwork timber — vertical height contribution, in mm. Sheet rows 27-29. */
export const TIMBER = {
  joists: 100, // E27
  bearer: 150, // E28
  ply: 17, // E29
} as const;

/** Always-present timber stack contribution: 100 + 150 + 17 = 267mm. */
export const FIXED_TIMBER = TIMBER.joists + TIMBER.bearer + TIMBER.ply;

/**
 * U-Head (top screwjack) adjustable range, in mm.
 * Min is constant. Max depends on slab thickness AND frame count:
 *   thin (single | double | triple): 500  (sheet E24, and rows 57 all = 500)
 *   thick single:                    450  (sheet H24)
 *   thick double | triple:           300  (sheet H25)
 */
export const U_HEAD = {
  min: 100, // D24
  maxThin: 500, // E24 — applies to thin singles AND thin doubles/triples
  maxThickSingle: 450, // H24
  maxThickMulti: 300, // H25
} as const;

/** Flat Jack (base screwjack) adjustable range, in mm. Sheet D21/E21/H21. */
export const FLAT_JACK = {
  min: 50, // D21
  maxThin: 500, // E21
  maxThick: 300, // H21 — reduced for thick slabs
} as const;

/**
 * Prop Inner No 1 (telescoping inner base) adjustable range, in mm. Sheet D20/E20.
 * Thin slabs only — unavailable for thick slabs (>= SLAB_THRESHOLD).
 */
export const PROP_INNER = {
  min: 300, // D20
  max: 1050, // E20
} as const;

/** Slab thickness at or above which the slab is "thick". Sheet E31. */
export const SLAB_THRESHOLD = 221;

/** Defensive bounds for the slab inputs (mm) — keep non-finite / absurd values out of state. */
export const INPUT_LIMITS = {
  slabHeightMax: 20000,
  slabThicknessMax: 2000,
} as const;
