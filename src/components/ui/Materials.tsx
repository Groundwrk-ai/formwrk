/**
 * The component / materials breakdown — the primary panel of the app.
 *
 * Two tabs:
 *   Optimal — the components of the active configuration (a descriptive,
 *             per-bay bill of materials with live screwjack steppers).
 *   Other   — every other valid configuration for the entered height; picking
 *             one sets it active and returns to the Optimal view.
 */
import { useState } from 'react';
import { useFormworkStore } from '../../store/formworkStore';
import { buildBom } from '../../logic/bom';
import { simplestValidConfig } from '../../logic/catalogue';
import { ExtensionStepper } from './ExtensionStepper';
import { ConfigList } from './ConfigList';

export function Materials() {
  const [tab, setTab] = useState<'optimal' | 'other'>('optimal');

  const config = useFormworkStore((s) => s.config);
  const range = useFormworkStore((s) => s.range);
  const slabHeight = useFormworkStore((s) => s.slabHeight);
  const slabThickness = useFormworkStore((s) => s.slabThickness);
  const setConfig = useFormworkStore((s) => s.setConfig);

  const optimal = simplestValidConfig(slabHeight, slabThickness);
  const isOptimal = !optimal || optimal.id === config.id;

  const sections = buildBom(config, range);
  // Singles' labels are just "6ft" etc., so prefix them; doubles/triples already say so.
  const summary = config.frames.length === 1 ? `Single · ${config.label}` : config.label;

  return (
    <section className="card materials">
      <div className="tabs">
        <button
          type="button"
          className={`tab${tab === 'optimal' ? ' active' : ''}`}
          onClick={() => setTab('optimal')}
        >
          Optimal
        </button>
        <button
          type="button"
          className={`tab${tab === 'other' ? ' active' : ''}`}
          onClick={() => setTab('other')}
        >
          Other
        </button>
      </div>

      {tab === 'other' ? (
        <ConfigList
          onPick={(c) => {
            setConfig(c);
            setTab('optimal');
          }}
        />
      ) : (
        <>
          <div className="materials-head">
            <span className="materials-kind">{summary}</span>
            {!isOptimal && optimal ? (
              <button type="button" className="revert" onClick={() => setConfig(optimal)}>
                ↩ optimal
              </button>
            ) : null}
          </div>

          {sections.map((section) => (
            <div key={section.title} className="bom-section">
              <div className="bom-section-title">{section.title}</div>
              {section.items.map((item, i) => (
                <div key={i} className={`bom-item${item.live ? ' live' : ''}`}>
                  <div className="bom-item-main">
                    <span className="bom-name">{item.name}</span>
                    {item.qty ? <span className="bom-qty">×{item.qty}</span> : null}
                  </div>
                  {item.detail ? <div className="bom-detail">{item.detail}</div> : null}
                  {item.control ? <ExtensionStepper which={item.control} /> : null}
                </div>
              ))}
            </div>
          ))}
        </>
      )}
    </section>
  );
}
