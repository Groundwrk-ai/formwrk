/**
 * The component / materials breakdown — the primary panel of the app.
 * Lists every part of the current shoring bay with a descriptive name, a
 * per-bay quantity, and live dimensions. Adjustable screwjacks expose an
 * inline stepper (and can also be dragged in the 3D view).
 */
import { useFormworkStore } from '../../store/formworkStore';
import { buildBom } from '../../logic/bom';
import { ExtensionStepper } from './ExtensionStepper';

export function Materials() {
  const config = useFormworkStore((s) => s.config);
  const range = useFormworkStore((s) => s.range);

  const sections = buildBom(config, range);
  const frameCount = config.frames.length;
  const kind = frameCount === 1 ? 'Single' : frameCount === 2 ? 'Double' : 'Triple';

  return (
    <section className="card materials">
      <div className="materials-head">
        <h2>Components</h2>
        <span className="materials-kind">{kind} · {config.label}</span>
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
    </section>
  );
}
