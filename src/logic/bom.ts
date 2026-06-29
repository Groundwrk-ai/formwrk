/**
 * Bill of materials for the current shoring bay.
 *
 * This app's primary job is to ILLUSTRATE THE COMPONENTS, so this turns the
 * active configuration + live screwjack extensions into a readable component
 * list with descriptive names, quantities (per bay: two ladder frames, four
 * legs), and live dimensions (e.g. "U-Head — extended to 250 mm").
 */

import type { FrameConfig } from './configurations';
import { FRAME_HEIGHTS, ROCKETS } from './frameData';
import type { HeightRange } from './heightCalc';

export interface BomItem {
  name: string;
  qty?: number; // "off" count for the bay, where well-defined
  detail?: string; // size / live extension text
  live?: boolean; // value changes as a screwjack is dragged
  control?: 'uHead' | 'base'; // renders an inline extension stepper
}

export interface BomSection {
  title: string;
  items: BomItem[];
}

const FT_LABEL: Record<string, string> = {
  '3ft': '3Ft',
  '4ft': '4Ft',
  '5ft': '5Ft',
  '6ft': '6Ft',
  '7ft': '7Ft',
};

const mm = (v: number) => `${Math.round(v)} mm`;

export function buildBom(config: FrameConfig, range: HeightRange): BomSection[] {
  const levels = config.frames.length;

  // Frames grouped by size — two ladder frames per level (front + back).
  const counts: Record<string, number> = {};
  for (const f of config.frames) counts[f] = (counts[f] ?? 0) + 1;
  const frameItems: BomItem[] = Object.entries(counts).map(([size, n]) => ({
    name: `${FT_LABEL[size] ?? size} Frame`,
    qty: n * 2,
    detail: `${mm(FRAME_HEIGHTS[size] ?? 0)} high`,
  }));
  frameItems.push({ name: 'Diagonal cross-brace', qty: 4 * levels });

  const rocketMm = ROCKETS[config.rocket] ?? 0;
  const extensionItems: BomItem[] = rocketMm > 0
    ? [{ name: `${rocketMm}mm Extension Tube`, qty: 4, detail: `slides over each leg` }]
    : [{ name: 'No extension' }];

  const baseName = config.baseType === 'propInner' ? 'Prop Inner No 1' : 'Flat Jack';

  return [
    { title: 'Frames', items: frameItems },
    { title: 'Extensions', items: extensionItems },
    {
      title: 'Head',
      items: [
        {
          name: 'U-Head Screwjack',
          qty: 4,
          detail: `range ${mm(range.uHeadMin)}–${mm(range.uHeadMax)}`,
          live: true,
          control: 'uHead',
        },
      ],
    },
    {
      title: 'Base',
      items: [
        {
          name: `${baseName} Screwjack`,
          qty: 4,
          detail: `range ${mm(range.baseMin)}–${mm(range.baseMax)}`,
          live: true,
          control: 'base',
        },
      ],
    },
    {
      title: 'Timber deck',
      items: [
        { name: 'LVL Bearer', qty: 2, detail: '150 × 77 mm' },
        { name: 'LVL Joist', detail: '95 × 65 mm' },
        { name: 'Form-Ply deck', detail: '17 mm' },
      ],
    },
  ];
}
