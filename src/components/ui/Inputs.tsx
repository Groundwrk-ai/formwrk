/** Slab inputs + the auto-assembled configuration readout. */
import { useFormworkStore } from '../../store/formworkStore';
import { SLAB_THRESHOLD } from '../../logic/frameData';

export function Inputs() {
  const slabHeight = useFormworkStore((s) => s.slabHeight);
  const slabThickness = useFormworkStore((s) => s.slabThickness);
  const setSlabHeight = useFormworkStore((s) => s.setSlabHeight);
  const setSlabThickness = useFormworkStore((s) => s.setSlabThickness);
  const isThick = slabThickness >= SLAB_THRESHOLD;

  return (
    <section className="card">
      <h2>Inputs</h2>
      <label className="field">
        <span>Slab height (mm)</span>
        <input
          type="number"
          value={slabHeight}
          min={0}
          step={10}
          onChange={(e) => setSlabHeight(Number(e.target.value))}
        />
      </label>
      <span className="hint">floor to soffit</span>
      <label className="field">
        <span>Slab thickness (mm)</span>
        <input
          type="number"
          value={slabThickness}
          min={0}
          step={5}
          onChange={(e) => setSlabThickness(Number(e.target.value))}
        />
      </label>

      <div className="config">
        <span className={`badge ${isThick ? 'thick' : 'thin'}`}>
          {isThick ? `Thick slab ≥${SLAB_THRESHOLD}mm` : `Thin slab <${SLAB_THRESHOLD}mm`}
        </span>
      </div>
    </section>
  );
}
