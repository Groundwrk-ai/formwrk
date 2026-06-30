/**
 * Per-bay component quantities, shared by BOTH the 3D scene and the bill of
 * materials so the two can never disagree.
 *
 * The frame/leg/brace/jack counts describe one shoring bay exactly. The timber
 * deck quantities (joists, ply) are INDICATIVE for a single illustrative bay —
 * real joist spacing and ply coverage depend on the deck design, so they are
 * labelled as assumptions in the BOM, not engineered procurement quantities.
 */
export const BAY_QUANTITIES = {
  /** Ladder frames per stacked level (front + back). */
  framesPerLevel: 2,
  /** Legs / columns in a bay. */
  legs: 4,
  /** Diagonal cross-braces per level (an X on each open side). */
  crossBracesPerLevel: 4,
  /** Bearers spanning the U-heads. */
  bearers: 2,
  /** Joists rendered across the bearers (indicative spacing). */
  joists: 9,
  /** Ply deck sheets (indicative — one illustrative bay). */
  plySheets: 1,
} as const;
