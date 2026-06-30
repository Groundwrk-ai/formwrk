/**
 * The signature height panel: serviceable min/max range, the target slab height,
 * the live current height, and a verdict.
 *
 * The verdict distinguishes "this configuration CAN service the target height"
 * (serviceable) from "the assembly is CURRENTLY dialled to the target"
 * (meetsTarget). Green is reserved for the latter so an under-extended tower is
 * never shown as if it already meets the soffit.
 */
import { useFormworkStore } from '../../store/formworkStore';

const mm = (v: number) => `${Math.round(v)} mm`;
const pct = (v: number) => `${Math.max(0, Math.min(100, v * 100)).toFixed(1)}%`;

export function HeightDisplay() {
  const range = useFormworkStore((s) => s.range);
  const currentHeight = useFormworkStore((s) => s.currentHeight);
  const slabHeight = useFormworkStore((s) => s.slabHeight);
  const isValid = useFormworkStore((s) => s.isValid);
  const meetsTarget = useFormworkStore((s) => s.meetsTarget);
  const hasValidOption = useFormworkStore((s) => s.hasValidOption);

  const span = Math.max(1, range.max - range.min);
  const currentPos = (currentHeight - range.min) / span;
  const targetPos = (slabHeight - range.min) / span;
  const delta = slabHeight - currentHeight;

  let verdictClass: 'ok' | 'bad' | 'warn';
  let verdictText: string;
  if (!hasValidOption) {
    verdictClass = 'bad';
    verdictText = '✗ No configuration services this height';
  } else if (!isValid) {
    verdictClass = 'bad';
    verdictText = '✗ Target outside this configuration’s range';
  } else if (meetsTarget) {
    verdictClass = 'ok';
    verdictText = '✓ Assembly set to target';
  } else {
    verdictClass = 'warn';
    verdictText = `Serviceable — ${delta >= 0 ? 'raise' : 'lower'} jacks ${mm(Math.abs(delta))} to reach target`;
  }

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

      <div className={`verdict ${verdictClass}`}>{verdictText}</div>
    </section>
  );
}
