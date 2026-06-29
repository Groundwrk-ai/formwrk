/** Slab height + thickness inputs. */
import { useState } from 'react';
import { useFormworkStore } from '../../store/formworkStore';

/**
 * A numeric field that behaves well on mobile: uses a text input with a numeric
 * keypad (inputMode), strips non-digits and leading zeros (no "0" stuck at the
 * start), and allows the field to be empty while editing without snapping to 0.
 */
function NumberInput({
  value,
  onCommit,
  ariaLabel,
}: {
  value: number;
  onCommit: (n: number) => void;
  ariaLabel: string;
}) {
  const [text, setText] = useState(String(value));

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={text}
      aria-label={ariaLabel}
      onChange={(e) => {
        const digits = e.target.value.replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '');
        setText(digits);
        if (digits !== '') onCommit(Number(digits));
      }}
      onBlur={() => {
        if (text === '') setText(String(value));
      }}
    />
  );
}

export function Inputs() {
  const slabHeight = useFormworkStore((s) => s.slabHeight);
  const slabThickness = useFormworkStore((s) => s.slabThickness);
  const setSlabHeight = useFormworkStore((s) => s.setSlabHeight);
  const setSlabThickness = useFormworkStore((s) => s.setSlabThickness);

  return (
    <section className="card">
      <h2>Inputs</h2>
      <label className="field">
        <span>Slab height (mm)</span>
        <NumberInput value={slabHeight} onCommit={setSlabHeight} ariaLabel="slab height in millimetres" />
      </label>
      <span className="hint">floor to soffit</span>
      <label className="field">
        <span>Slab thickness (mm)</span>
        <NumberInput value={slabThickness} onCommit={setSlabThickness} ariaLabel="slab thickness in millimetres" />
      </label>
    </section>
  );
}
