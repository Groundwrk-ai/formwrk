/**
 * A controlled drag slider: fill + thumb + a value bubble centred above the track, with
 * an optional target marker. Pointer + keyboard driven. Shared by the height track and the
 * Head / Base extension controls so all three read and behave identically.
 */
import { useRef } from 'react';

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
const pct = (v: number): string => `${clamp01(v) * 100}%`;

export function RangeSlider({
  min,
  max,
  value,
  onChange,
  showTarget = false,
  targetValue = 0,
  ariaLabel,
}: {
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
  showTarget?: boolean;
  targetValue?: number;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const span = Math.max(1, max - min);
  const pos = (value - min) / span;
  const targetPos = (targetValue - min) / span;

  const setFromClientX = (clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const frac = clamp01((clientX - r.left) / Math.max(1, r.width));
    onChange(min + frac * span);
  };

  return (
    <div className="rslider">
      <div className="rslider-bubble">{Math.round(value)} mm</div>
      <div
        ref={ref}
        className="track draggable"
        role="slider"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-valuemin={Math.round(min)}
        aria-valuemax={Math.round(max)}
        aria-valuenow={Math.round(value)}
        onPointerDown={(e) => {
          dragging.current = true;
          setFromClientX(e.clientX); // set first — capture is best-effort
          try {
            ref.current?.setPointerCapture(e.pointerId);
          } catch {
            /* pointer capture unavailable — drag still works via move events */
          }
        }}
        onPointerMove={(e) => {
          if (dragging.current) setFromClientX(e.clientX);
        }}
        onPointerUp={(e) => {
          dragging.current = false;
          try {
            ref.current?.releasePointerCapture(e.pointerId);
          } catch {
            /* ignore */
          }
        }}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 50 : 10;
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
            onChange(value + step);
            e.preventDefault();
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
            onChange(value - step);
            e.preventDefault();
          }
        }}
      >
        <div className="fill" style={{ width: pct(pos) }} />
        {showTarget && <div className="target" style={{ left: pct(targetPos) }} />}
        <div className="thumb" style={{ left: pct(pos) }} />
      </div>
    </div>
  );
}
