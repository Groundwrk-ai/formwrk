/**
 * Touch-friendly extension control for a screwjack, shown inline in the
 * Components list. Editable numeric value plus +/- steppers, clamped to the
 * current range. Mirrors the 3D drag — both write the same store value.
 */
import { useFormworkStore } from '../../store/formworkStore';

const STEP = 10; // mm

export function ExtensionStepper({ which }: { which: 'uHead' | 'base' }) {
  const value = useFormworkStore((s) => (which === 'uHead' ? s.uHeadExtension : s.baseExtension));
  const range = useFormworkStore((s) => s.range);
  const setUHead = useFormworkStore((s) => s.setUHeadExtension);
  const setBase = useFormworkStore((s) => s.setBaseExtension);

  const setValue = which === 'uHead' ? setUHead : setBase;
  const min = which === 'uHead' ? range.uHeadMin : range.baseMin;
  const max = which === 'uHead' ? range.uHeadMax : range.baseMax;

  return (
    <div className="stepper">
      <button
        type="button"
        className="stepper-btn"
        onClick={() => setValue(value - STEP)}
        disabled={value <= min}
        aria-label="decrease extension"
      >
        −
      </button>
      <input
        className="stepper-input"
        type="number"
        value={value}
        min={min}
        max={max}
        step={STEP}
        onChange={(e) => setValue(Number(e.target.value))}
        aria-label="extension in millimetres"
      />
      <span className="stepper-unit">mm</span>
      <button
        type="button"
        className="stepper-btn"
        onClick={() => setValue(value + STEP)}
        disabled={value >= max}
        aria-label="increase extension"
      >
        +
      </button>
    </div>
  );
}
