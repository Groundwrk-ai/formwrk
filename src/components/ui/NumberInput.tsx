/**
 * A numeric field that behaves well on mobile: uses a text input with a numeric
 * keypad (inputMode), strips non-digits and leading zeros (no "0" stuck at the
 * start), and allows the field to be empty while editing without snapping to 0.
 *
 * Shared by the Inputs and Custom panels.
 */
import { useState } from 'react';

export function NumberInput({
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
      maxLength={6}
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
