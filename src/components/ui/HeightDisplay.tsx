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
import { HeightTrack } from './HeightTrack';

const mm = (v: number) => `${Math.round(v)} mm`;
/** Bracketed, italicised amount Min/Max sits below/above Current (rendered via .variance). */
const varLabel = (delta: number, sign: '−' | '+') => (delta <= 0 ? '(0 mm)' : `(${sign}${delta} mm)`);

export function HeightDisplay() {
  const range = useFormworkStore((s) => s.range);
  const currentHeight = useFormworkStore((s) => s.currentHeight);
  const slabHeight = useFormworkStore((s) => s.slabHeight);
  const isValid = useFormworkStore((s) => s.isValid);
  const meetsTarget = useFormworkStore((s) => s.meetsTarget);
  const hasValidOption = useFormworkStore((s) => s.hasValidOption);
  const dialToTarget = useFormworkStore((s) => s.dialToTarget);

  const delta = slabHeight - currentHeight;
  const belowMin = Math.round(currentHeight - range.min);
  const aboveMax = Math.round(range.max - currentHeight);

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
        <span className="v"><span className="variance">{varLabel(belowMin, '−')}</span>{mm(range.min)}</span>
      </div>
      <div className="metric">
        <span className="k">Max</span>
        <span className="v"><span className="variance">{varLabel(aboveMax, '+')}</span>{mm(range.max)}</span>
      </div>

      <HeightTrack showTarget />
      <div className="range-row">
        <span>{mm(range.min)}</span>
        <span>{mm(range.max)}</span>
      </div>

      <div className="metric big">
        <span className="k">Current</span>
        <span className="v">{mm(currentHeight)}</span>
      </div>
      <div className="metric">
        <span className="k">Input height</span>
        <span className="v">{mm(slabHeight)}</span>
      </div>

      {isValid && !meetsTarget && (
        <button type="button" className="dial-btn" onClick={dialToTarget}>
          ⇧ Dial jacks to target
        </button>
      )}

      <div className={`verdict ${verdictClass}`}>{verdictText}</div>
    </section>
  );
}
