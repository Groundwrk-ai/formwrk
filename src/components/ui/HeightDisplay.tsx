/**
 * The signature height panel: serviceable min/max range, the target slab height,
 * the live current height, and a validity verdict. The range bar animates as the
 * configuration changes or the screwjacks are dragged.
 */
import { useFormworkStore } from '../../store/formworkStore';

const mm = (v: number) => `${Math.round(v)} mm`;
const pct = (v: number) => `${Math.max(0, Math.min(100, v * 100)).toFixed(1)}%`;

export function HeightDisplay() {
  const range = useFormworkStore((s) => s.range);
  const currentHeight = useFormworkStore((s) => s.currentHeight);
  const slabHeight = useFormworkStore((s) => s.slabHeight);
  const isValid = useFormworkStore((s) => s.isValid);

  const span = Math.max(1, range.max - range.min);
  const currentPos = (currentHeight - range.min) / span;
  const targetPos = (slabHeight - range.min) / span;

  return (
    <section className="card height">
      <h2>Height range</h2>

      <div className="metric">
        <span className="k">Min</span>
        <span className="v">{mm(range.min)}</span>
      </div>
      <div className="metric">
        <span className="k">Max</span>
        <span className="v">{mm(range.max)}</span>
      </div>

      <div className="track" role="img" aria-label="serviceable range">
        <div className="fill" style={{ width: pct(currentPos) }} />
        <div className="target" style={{ left: pct(targetPos) }} />
      </div>
      <div className="range-row">
        <span>{mm(range.min)}</span>
        <span>{mm(range.max)}</span>
      </div>

      <div className="metric big">
        <span className="k">Your height</span>
        <span className="v">{mm(slabHeight)}</span>
      </div>
      <div className="metric">
        <span className="k">Current</span>
        <span className="v">{mm(currentHeight)}</span>
      </div>

      <div className={`verdict ${isValid ? 'ok' : 'bad'}`}>
        {isValid ? '✓ Within serviceable range' : '✗ Target outside range'}
      </div>
    </section>
  );
}
