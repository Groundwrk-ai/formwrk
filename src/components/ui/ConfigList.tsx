/**
 * The "Other" tab: every configuration whose serviceable range contains the
 * entered slab height, simplest-first. Picking one sets it active and returns
 * to the Components view. This is also how the 3/4ft triples become reachable.
 */
import { useFormworkStore } from '../../store/formworkStore';
import { validConfigsRanked } from '../../logic/catalogue';
import { calcHeightRange } from '../../logic/heightCalc';
import type { FrameConfig } from '../../logic/configurations';

const kindOf = (n: number) => (n === 1 ? 'Single' : n === 2 ? 'Double' : 'Triple');

export function ConfigList({ onPick }: { onPick: (c: FrameConfig) => void }) {
  const slabHeight = useFormworkStore((s) => s.slabHeight);
  const slabThickness = useFormworkStore((s) => s.slabThickness);
  const activeId = useFormworkStore((s) => s.config.id);

  const list = validConfigsRanked(slabHeight, slabThickness);
  const optimalId = list[0]?.id;

  if (list.length === 0) {
    return (
      <div className="config-empty">
        No configuration services {Math.round(slabHeight)} mm at this slab thickness. Adjust the
        slab height.
      </div>
    );
  }

  return (
    <div className="config-list">
      <div className="config-list-head">
        {list.length} option{list.length === 1 ? '' : 's'} service {Math.round(slabHeight)} mm
      </div>
      {list.map((c) => {
        const r = calcHeightRange(c, slabThickness);
        return (
          <button
            key={c.id}
            type="button"
            className={`config-row${c.id === activeId ? ' active' : ''}`}
            onClick={() => onPick(c)}
          >
            <div className="config-row-main">
              <span className="config-row-label">{c.label}</span>
              {c.id === optimalId ? <span className="config-badge">Optimal</span> : null}
            </div>
            <div className="config-row-meta">
              {kindOf(c.frames.length)} · services {Math.round(r.min)}–{Math.round(r.max)} mm
            </div>
          </button>
        );
      })}
    </div>
  );
}
