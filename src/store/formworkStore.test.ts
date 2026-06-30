import { describe, it, expect, beforeEach } from 'vitest';
import { useFormworkStore } from './formworkStore';
import { CONFIG_BY_ID } from '../logic/configurations';

const get = () => useFormworkStore.getState();

beforeEach(() => {
  // Reset to a known baseline: thin 200mm slab, 2800mm soffit -> 6ft Flat Jack at min extensions.
  get().setSlabThickness(200);
  get().setSlabHeight(2800);
  get().setConfig(CONFIG_BY_ID['s-6ft-fj']);
  get().setUHeadExtension(0); // clamps to min
  get().setBaseExtension(0); // clamps to min
});

describe('store: slab-availability invariant (Finding 1)', () => {
  it('a Prop Inner never stays active on a thick slab, even when no config services the height', () => {
    get().setSlabHeight(4100);
    get().setConfig(CONFIG_BY_ID['s-6ft-500-pi']); // a thin Prop Inner config (valid at 4100 thin)
    expect(get().config.id).toBe('s-6ft-500-pi');

    get().setSlabHeight(7000); // nothing services this height
    get().setSlabThickness(250); // thick
    expect(get().config.baseType).not.toBe('propInner');
    expect(get().available).toBe(true); // active config is always permitted for the slab
  });

  it('setConfig coerces away a Prop Inner that is prohibited for a thick slab', () => {
    get().setSlabThickness(250); // thick -> Prop Inner unavailable
    get().setConfig(CONFIG_BY_ID['s-6ft-pi']); // attempt a prohibited config
    expect(get().config.baseType).not.toBe('propInner');
    expect(get().available).toBe(true);
  });

  it('isValid requires BOTH availability and height-in-range; flags no-valid-option', () => {
    get().setSlabHeight(7000);
    expect(get().hasValidOption).toBe(false);
    expect(get().isValid).toBe(false);
  });
});

describe('store: input hardening (Finding 7)', () => {
  it('rejects non-finite slab inputs (Infinity / NaN)', () => {
    const h = get().slabHeight;
    get().setSlabHeight(Infinity);
    get().setSlabHeight(NaN);
    expect(get().slabHeight).toBe(h);

    const t = get().slabThickness;
    get().setSlabThickness(Infinity);
    expect(get().slabThickness).toBe(t);
  });

  it('clamps absurdly large values to the supported maximum (no Infinity into the scene)', () => {
    get().setSlabHeight(999999);
    expect(Number.isFinite(get().slabHeight)).toBe(true);
    expect(get().slabHeight).toBeLessThanOrEqual(20000);
  });

  it('rejects non-finite extension values', () => {
    const u = get().uHeadExtension;
    get().setUHeadExtension(Infinity);
    expect(get().uHeadExtension).toBe(u);
  });
});

describe('store: verdict-supporting derived state (Finding 3)', () => {
  it('default 6ft FJ at 2800mm is serviceable but not yet at target', () => {
    expect(get().config.id).toBe('s-6ft-fj');
    expect(get().isValid).toBe(true);
    expect(get().currentHeight).toBeLessThan(get().slabHeight);
    expect(get().meetsTarget).toBe(false);
  });

  it('meetsTarget becomes true only when extensions dial current to the target', () => {
    // 6ft FJ thin: current = 1830 + 267 + uHead + base; target 2800 -> uHead+base = 703
    get().setUHeadExtension(500);
    get().setBaseExtension(203);
    expect(get().currentHeight).toBe(2800);
    expect(get().meetsTarget).toBe(true);
    expect(get().isValid).toBe(true);
  });
});
