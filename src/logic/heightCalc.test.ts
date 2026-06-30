import { describe, it, expect } from 'vitest';
import { CONFIGURATIONS, CONFIG_BY_ID } from './configurations';
import {
  calcHeightRange,
  isAvailableForSlab,
  isConfigValidForInputs,
  currentHeight,
  isThickSlab,
  allocateExtensionsToTarget,
} from './heightCalc';
import {
  simplestValidConfig,
  validConfigsForInputs,
  configsForSlab,
  validConfigsRanked,
  simplestAvailableConfig,
} from './catalogue';

// A representative thin and thick slab thickness.
const THIN = 200;
const THICK = 250;

/**
 * Expected [min, max] taken DIRECTLY from Formwork_Material_Selection_v2.xlsx.
 * Thin: sheet rows 55 (min) / 60 (max). Thick: rows 110 (min) / 115 (max).
 * This is the spreadsheet acting as the test oracle.
 */
const THIN_EXPECTED: Record<string, [number, number]> = {
  's-3ft-fj': [1332, 2182],
  's-4ft-fj': [1636, 2486],
  's-5ft-fj': [1940, 2790],
  's-6ft-fj': [2247, 3097],
  's-6ft-pi': [2497, 3647],
  's-6ft-300-pi': [2797, 3947],
  's-6ft-500-fj': [2747, 3597],
  's-6ft-500-pi': [2997, 4147],
  's-7ft-fj': [2551, 3401],
  's-7ft-pi': [2801, 3951],
  's-7ft-300-fj': [2851, 3701],
  's-7ft-300-pi': [3101, 4251],
  's-7ft-500-fj': [3051, 3901],
  's-7ft-500-pi': [3301, 4451],
  'd-5-6': [3770, 4620],
  'd-5-7': [4074, 4924],
  'd-6-6': [4077, 4927],
  'd-6-7': [4381, 5231],
  'd-7-7': [4685, 5535],
  't-3-3-3': [3162, 4012],
  't-3-3-4': [3466, 4316],
  't-3-5-5': [4378, 5228],
  't-4-5-5': [4682, 5532],
  't-5-5-5': [4986, 5836],
  't-5-5-6': [5293, 6143],
  't-5-6-6': [5600, 6450],
  't-6-6-6': [5907, 6757],
};

// Thick table — Flat Jack configs only (Prop Inner unavailable when thick).
const THICK_EXPECTED: Record<string, [number, number]> = {
  's-3ft-fj': [1332, 1932],
  's-4ft-fj': [1636, 2236],
  's-5ft-fj': [1940, 2540],
  's-6ft-fj': [2247, 2847],
  's-6ft-500-fj': [2747, 3347],
  's-7ft-fj': [2551, 3151],
  's-7ft-300-fj': [2851, 3451],
  's-7ft-500-fj': [3051, 3651],
  'd-5-6': [3770, 4220],
  'd-5-7': [4074, 4524],
  'd-6-6': [4077, 4527],
  'd-6-7': [4381, 4831],
  'd-7-7': [4685, 5135],
  't-3-3-3': [3162, 3612],
  't-3-3-4': [3466, 3916],
  't-3-5-5': [4378, 4828],
  't-4-5-5': [4682, 5132],
  't-5-5-5': [4986, 5436],
  't-5-5-6': [5293, 5743],
  't-5-6-6': [5600, 6050],
  't-6-6-6': [5907, 6357],
};

describe('catalogue shape', () => {
  it('has 27 canonical configs (14 singles + 5 doubles + 8 triples)', () => {
    expect(CONFIGURATIONS).toHaveLength(27);
    expect(CONFIGURATIONS.filter((c) => c.frames.length === 1)).toHaveLength(14);
    expect(CONFIGURATIONS.filter((c) => c.frames.length === 2)).toHaveLength(5);
    expect(CONFIGURATIONS.filter((c) => c.frames.length === 3)).toHaveLength(8);
  });

  it('has unique ids', () => {
    expect(new Set(CONFIGURATIONS.map((c) => c.id)).size).toBe(27);
  });

  it('thin table = 27 entries, thick table = 21 (thin minus 6 Prop Inner)', () => {
    expect(configsForSlab(THIN)).toHaveLength(27);
    expect(configsForSlab(THICK)).toHaveLength(21);
    expect(CONFIGURATIONS.filter((c) => c.baseType === 'propInner')).toHaveLength(6);
  });
});

describe('calcHeightRange — thin slab (< 221mm) matches the spreadsheet', () => {
  for (const [id, [min, max]] of Object.entries(THIN_EXPECTED)) {
    it(`${id}: ${min}..${max}`, () => {
      const r = calcHeightRange(CONFIG_BY_ID[id], THIN);
      expect(r.min).toBe(min);
      expect(r.max).toBe(max);
    });
  }
});

describe('calcHeightRange — thick slab (>= 221mm) matches the spreadsheet', () => {
  for (const [id, [min, max]] of Object.entries(THICK_EXPECTED)) {
    it(`${id}: ${min}..${max}`, () => {
      const r = calcHeightRange(CONFIG_BY_ID[id], THICK);
      expect(r.min).toBe(min);
      expect(r.max).toBe(max);
    });
  }
});

describe('brief spot-checks', () => {
  it('6ft flat jack thin: 2247 / 3097', () => {
    const r = calcHeightRange(CONFIG_BY_ID['s-6ft-fj'], THIN);
    expect([r.min, r.max]).toEqual([2247, 3097]);
  });
  it('7ft prop inner thin: 2801 / 3951', () => {
    const r = calcHeightRange(CONFIG_BY_ID['s-7ft-pi'], THIN);
    expect([r.min, r.max]).toEqual([2801, 3951]);
  });
  it('5ft+6ft double thin: 3770 / 4620', () => {
    const r = calcHeightRange(CONFIG_BY_ID['d-5-6'], THIN);
    expect([r.min, r.max]).toEqual([3770, 4620]);
  });
  it('6ft flat jack thick: 2247 / 2847 (U-Head capped 450, FJ capped 300)', () => {
    const r = calcHeightRange(CONFIG_BY_ID['s-6ft-fj'], THICK);
    expect([r.min, r.max]).toEqual([2247, 2847]);
    expect(r.uHeadMax).toBe(450);
    expect(r.baseMax).toBe(300);
  });
});

describe('slab threshold + availability', () => {
  it('221mm is thick (boundary inclusive)', () => {
    expect(isThickSlab(220)).toBe(false);
    expect(isThickSlab(221)).toBe(true);
  });
  it('Prop Inner unavailable for thick, available for thin', () => {
    expect(isAvailableForSlab(CONFIG_BY_ID['s-6ft-pi'], THIN)).toBe(true);
    expect(isAvailableForSlab(CONFIG_BY_ID['s-6ft-pi'], THICK)).toBe(false);
  });
  it('a thick Prop Inner config is never valid even within its thin range', () => {
    expect(isConfigValidForInputs(CONFIG_BY_ID['s-6ft-pi'], 3000, THICK)).toBe(false);
  });
});

describe('thin doubles/triples keep U-Head max at 500', () => {
  it('5ft+6ft thin uHeadMax = 500', () => {
    expect(calcHeightRange(CONFIG_BY_ID['d-5-6'], THIN).uHeadMax).toBe(500);
  });
  it('3ft+3ft+3ft thin uHeadMax = 500; thick = 300', () => {
    expect(calcHeightRange(CONFIG_BY_ID['t-3-3-3'], THIN).uHeadMax).toBe(500);
    expect(calcHeightRange(CONFIG_BY_ID['t-3-3-3'], THICK).uHeadMax).toBe(300);
  });
});

describe('currentHeight = min at min extensions, = max at max extensions', () => {
  it('6ft FJ thin endpoints reproduce the range', () => {
    const c = CONFIG_BY_ID['s-6ft-fj'];
    const r = calcHeightRange(c, THIN);
    expect(currentHeight(c, r.uHeadMin, r.baseMin)).toBe(r.min);
    expect(currentHeight(c, r.uHeadMax, r.baseMax)).toBe(r.max);
  });
});

describe('simplest valid config (auto-assemble)', () => {
  it('3000mm thin -> 6ft Flat Jack (simplest valid single)', () => {
    expect(simplestValidConfig(3000, THIN)?.id).toBe('s-6ft-fj');
  });
  it('3000mm thick -> 7ft Flat Jack (6ft thick maxes at 2847, so 7ft no-ext is simplest)', () => {
    expect(simplestValidConfig(3000, THICK)?.id).toBe('s-7ft-fj');
  });
  it('5000mm thin -> 6ft+7ft double (no single reaches; smallest valid double)', () => {
    expect(simplestValidConfig(5000, THIN)?.id).toBe('d-6-7');
  });
  it('4100mm thin -> double 5+6 (a double beats a single needing extension + prop inner)', () => {
    const c = simplestValidConfig(4100, THIN);
    expect(c?.id).toBe('d-5-6');
    expect(c?.frames.length).toBe(2);
  });
  it('a single with extension + prop inner is never optimal when a double is valid', () => {
    // At 4100mm, 6ft+500 Prop Inner (single, ext + PI) IS valid but must not be chosen.
    expect(isConfigValidForInputs(CONFIG_BY_ID['s-6ft-500-pi'], 4100, THIN)).toBe(true);
    expect(simplestValidConfig(4100, THIN)?.id).not.toBe('s-6ft-500-pi');
  });
  it('returns null below the smallest min', () => {
    expect(simplestValidConfig(500, THIN)).toBeNull();
  });
  it('every returned config is actually valid for the inputs', () => {
    for (const h of [1500, 2500, 3500, 4500, 5500, 6500]) {
      const c = simplestValidConfig(h, THIN);
      if (c) expect(isConfigValidForInputs(c, h, THIN)).toBe(true);
      for (const v of validConfigsForInputs(h, THIN)) {
        expect(isConfigValidForInputs(v, h, THIN)).toBe(true);
      }
    }
  });
});

describe('Optimal ranking policy (cross-group order)', () => {
  // Archetype order: Single < Single+ext < Single+PI < Double < Single+ext+PI < Triple.
  const isPIext = (id: string) =>
    CONFIG_BY_ID[id].baseType === 'propInner' && CONFIG_BY_ID[id].rocket !== 'none';

  it('4100mm thin: doubles rank before single+ext+PropInner, which ranks before triples', () => {
    const ids = validConfigsRanked(4100, THIN).map((c) => c.id);
    const firstDouble = ids.findIndex((id) => id.startsWith('d-'));
    const firstPIext = ids.findIndex(isPIext);
    const firstTriple = ids.findIndex((id) => id.startsWith('t-'));
    expect(firstDouble).toBeGreaterThanOrEqual(0);
    expect(firstPIext).toBeGreaterThan(firstDouble);
    expect(firstTriple).toBeGreaterThan(firstPIext);
  });

  it('a plain single (FJ, no ext) outranks a single with an extension when both are valid', () => {
    // 3000mm thin: 6ft FJ (no-ext, valid) must beat 6ft+500 FJ (ext, also valid)
    const ids = validConfigsRanked(3000, THIN).map((c) => c.id);
    expect(ids.indexOf('s-6ft-fj')).toBeLessThan(ids.indexOf('s-6ft-500-fj'));
  });

  it('a single+extension outranks a single+PropInner when both are valid', () => {
    const ids = validConfigsRanked(3500, THIN).map((c) => c.id);
    expect(ids.indexOf('s-7ft-500-fj')).toBeLessThan(ids.indexOf('s-6ft-pi'));
  });
});

describe('simplestAvailableConfig (safe fallback)', () => {
  it('is a Flat Jack single for both thin and thick slabs (never Prop Inner)', () => {
    expect(simplestAvailableConfig(200).baseType).toBe('flatJack');
    expect(simplestAvailableConfig(250).baseType).toBe('flatJack');
    expect(simplestAvailableConfig(250).frames.length).toBe(1);
  });
});

describe('allocateExtensionsToTarget (auto-adjust the assembly to the soffit)', () => {
  it('hits the target exactly for every config + representative targets, within jack ranges', () => {
    for (const id of Object.keys(THIN_EXPECTED)) {
      const c = CONFIG_BY_ID[id];
      const r = calcHeightRange(c, THIN);
      for (const target of [r.min, Math.round((r.min + r.max) / 2), r.max]) {
        const { uHeadExtension, baseExtension } = allocateExtensionsToTarget(c, THIN, target);
        expect(uHeadExtension).toBeGreaterThanOrEqual(r.uHeadMin);
        expect(uHeadExtension).toBeLessThanOrEqual(r.uHeadMax);
        expect(baseExtension).toBeGreaterThanOrEqual(r.baseMin);
        expect(baseExtension).toBeLessThanOrEqual(r.baseMax);
        expect(currentHeight(c, uHeadExtension, baseExtension)).toBe(target);
      }
    }
  });

  it('clamps to the nearest end when the target is outside the range', () => {
    const c = CONFIG_BY_ID['s-6ft-fj'];
    const r = calcHeightRange(c, THIN);
    const below = allocateExtensionsToTarget(c, THIN, r.min - 500);
    expect(currentHeight(c, below.uHeadExtension, below.baseExtension)).toBe(r.min);
    const above = allocateExtensionsToTarget(c, THIN, r.max + 500);
    expect(currentHeight(c, above.uHeadExtension, above.baseExtension)).toBe(r.max);
  });
});
