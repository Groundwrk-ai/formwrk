/**
 * Top-of-rail tabs switching the Left Rail between the two tools:
 *   Inputs — enter a target slab height + thickness, get a configuration.
 *   Custom — hand-build a frame set, read back its serviceable height range.
 */
import { useFormworkStore, type PanelMode } from '../../store/formworkStore';

const TABS: Array<{ mode: PanelMode; label: string }> = [
  { mode: 'inputs', label: 'Inputs' },
  { mode: 'custom', label: 'Custom' },
];

export function PanelTabs() {
  const panelMode = useFormworkStore((s) => s.panelMode);
  const setPanelMode = useFormworkStore((s) => s.setPanelMode);

  return (
    <div className="tabs" role="tablist" aria-label="Panel mode">
      {TABS.map((t) => (
        <button
          key={t.mode}
          type="button"
          role="tab"
          aria-selected={panelMode === t.mode}
          className={`tab${panelMode === t.mode ? ' active' : ''}`}
          onClick={() => setPanelMode(t.mode)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
