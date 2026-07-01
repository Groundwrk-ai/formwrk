/**
 * A tiny SVG shoring-frame glyph for the Custom frame picker: two legs, top/bottom
 * rails and an X-brace, drawn at a height PROPORTIONAL to the real frame height — so the
 * options literally stand taller as the frame gets bigger, giving an at-a-glance sense of
 * size on top of the numeric label.
 */
import { FRAME_HEIGHTS } from '../../logic/frameData';

const MIN_MM = 915; // 3ft
const MAX_MM = 2134; // 7ft
const MIN_PX = 30;
const MAX_PX = 72;
const W = 22;

const toneColor = { active: '#ffffff', enabled: '#9fb0c4', disabled: '#4a5260' } as const;

export type GlyphTone = keyof typeof toneColor;

export function FrameGlyph({ size, tone }: { size: string; tone: GlyphTone }) {
  const mm = FRAME_HEIGHTS[size] ?? MIN_MM;
  const h = MIN_PX + ((mm - MIN_MM) / (MAX_MM - MIN_MM)) * (MAX_PX - MIN_PX);
  const stroke = toneColor[tone];
  const x0 = 3;
  const x1 = W - 3;
  const y0 = 2;
  const y1 = h - 2;
  // A mid rung count that grows a little with height, so taller frames read as ladders.
  const rungs = mm >= 1830 ? 3 : mm >= 1219 ? 2 : 1;
  const rungYs = Array.from({ length: rungs }, (_, i) => y0 + ((i + 1) / (rungs + 1)) * (y1 - y0));

  return (
    <svg width={W} height={h} viewBox={`0 0 ${W} ${h}`} aria-hidden="true" style={{ display: 'block' }}>
      <g stroke={stroke} strokeWidth={1.6} strokeLinecap="round" fill="none">
        {/* legs */}
        <line x1={x0} y1={y0} x2={x0} y2={y1} />
        <line x1={x1} y1={y0} x2={x1} y2={y1} />
        {/* top + bottom rails */}
        <line x1={x0} y1={y0} x2={x1} y2={y0} />
        <line x1={x0} y1={y1} x2={x1} y2={y1} />
        {/* X-brace */}
        <line x1={x0} y1={y0} x2={x1} y2={y1} strokeWidth={1.1} opacity={0.75} />
        <line x1={x1} y1={y0} x2={x0} y2={y1} strokeWidth={1.1} opacity={0.75} />
        {/* intermediate rungs */}
        {rungYs.map((y, i) => (
          <line key={i} x1={x0} y1={y} x2={x1} y2={y} strokeWidth={1} opacity={0.5} />
        ))}
      </g>
    </svg>
  );
}
