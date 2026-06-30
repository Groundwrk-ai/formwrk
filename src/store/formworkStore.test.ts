import { describe, it, expect, beforeEach } from 'vitest';
import { useFormworkStore } from './formworkStore';
import { CONFIG_BY_ID } from '../logic/configurations';

const get = () => useFormworkStore.getState();

beforeEach(() => {
  // Reset to a known baseline: thin 200mm slab, 2800mm soffit.
  get().setSlabThickness(200);
  get().setSlabHeight(2800);
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

describe('store: renders adjusted to the target soffit (every entry path)', () => {
  it('loads adjusted to the target (current == target, meetsTarget)', () => {
    expect(get().config.id).toBe('s-6ft-fj');
    expect(get().currentHeight).toBe(2800);
    expect(get().meetsTarget).toBe(true);
  });

  it('re-allocates to reach a new target height', () => {
    get().setSlabHeight(2600);
    expect(get().currentHeight).toBe(2600);
    expect(get().meetsTarget).toBe(true);

    get().setSlabHeight(5000); // auto-assembles a double that services 5000
    expect(get().currentHeight).toBe(5000);
    expect(get().meetsTarget).toBe(true);
  });

  it('picking a config from Other renders it adjusted to the current target', () => {
    get().setSlabHeight(3500);
    get().setConfig(CONFIG_BY_ID['s-7ft-pi']); // valid alternative at 3500 thin (2801–3951)
    expect(get().config.id).toBe('s-7ft-pi');
    expect(get().currentHeight).toBe(3500);
    expect(get().meetsTarget).toBe(true);
  });

  it('allocated extensions stay within each jack’s range', () => {
    const s = get();
    expect(s.uHeadExtension).toBeGreaterThanOrEqual(s.range.uHeadMin);
    expect(s.uHeadExtension).toBeLessThanOrEqual(s.range.uHeadMax);
    expect(s.baseExtension).toBeGreaterThanOrEqual(s.range.baseMin);
    expect(s.baseExtension).toBeLessThanOrEqual(s.range.baseMax);
  });

  it('a manual drag away from the target shows not-at-target (verdict no longer green)', () => {
    get().setUHeadExtension(get().range.uHeadMin);
    get().setBaseExtension(get().range.baseMin);
    expect(get().meetsTarget).toBe(false);
    expect(get().currentHeight).toBeLessThan(get().slabHeight);
    expect(get().isValid).toBe(true); // still serviceable, just not dialled
  });

  it('when nothing services the height, the assembly sits at the nearest end (no crash)', () => {
    get().setSlabHeight(7000);
    expect(get().hasValidOption).toBe(false);
    expect(Number.isFinite(get().currentHeight)).toBe(true);
    expect(get().currentHeight).toBe(get().range.max); // closest reachable below an unreachable target
  });
});

describe('store: view mode (Build / Explode / Pack)', () => {
  it('defaults to the assembled view', () => {
    expect(get().viewMode).toBe('assembled');
  });

  it('switches modes and is purely presentational (no effect on the assembly)', () => {
    const before = {
      config: get().config.id,
      currentHeight: get().currentHeight,
      uHead: get().uHeadExtension,
      base: get().baseExtension,
    };
    get().setViewMode('exploded');
    expect(get().viewMode).toBe('exploded');
    get().setViewMode('packed');
    expect(get().viewMode).toBe('packed');
    get().setViewMode('assembled');
    expect(get().viewMode).toBe('assembled');
    // The view mode must not perturb the configuration or the height solve.
    expect(get().config.id).toBe(before.config);
    expect(get().currentHeight).toBe(before.currentHeight);
    expect(get().uHeadExtension).toBe(before.uHead);
    expect(get().baseExtension).toBe(before.base);
  });
});
