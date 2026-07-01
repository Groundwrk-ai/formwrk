/** Slab height + thickness inputs. */
import { useFormworkStore } from '../../store/formworkStore';
import { NumberInput } from './NumberInput';

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
