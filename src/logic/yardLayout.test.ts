import { describe, it, expect } from 'vitest';
import { computeYard } from './yardLayout';
import { CONFIG_BY_ID } from './configurations';

const ids = (config: Parameters<typeof computeYard>[0]) => computeYard(config).map((c) => c.id);

describe('computeYard: only the materials the render uses', () => {
  it('a Flat Jack single shows frames + braces + flat-jacks + u-heads, and nothing else', () => {
    const got = ids(CONFIG_BY_ID['s-6ft-fj']);
    expect(got).toEqual(['frames-6ft', 'braces', 'flatJacks', 'uHeads']);
    expect(got).not.toContain('extensions');
    expect(got).not.toContain('propInners');
  });

  it('a Prop Inner + extension config swaps in extensions + prop-inners and drops flat-jacks', () => {
    const got = ids(CONFIG_BY_ID['s-7ft-500-pi']);
    expect(got).toContain('frames-7ft');
    expect(got).toContain('extensions');
    expect(got).toContain('propInners');
    expect(got).toContain('uHeads');
    expect(got).not.toContain('flatJacks');
  });

  it('a double shows one frame stack per distinct size', () => {
    const got = ids(CONFIG_BY_ID['d-5-6']); // 5ft + 6ft double
    expect(got).toContain('frames-5ft');
    expect(got).toContain('frames-6ft');
  });

  it('every emitted container is actually in use (none are dimmed/placeholder)', () => {
    for (const id of Object.keys(CONFIG_BY_ID)) {
      expect(computeYard(CONFIG_BY_ID[id]).every((c) => c.inUse)).toBe(true);
    }
  });
});
