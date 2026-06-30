/**
 * Top-right segmented control that switches the viewport presentation.
 * The highlighted segment is the current view; clicking animates the transition.
 *   Build   -> the erected, assembled tower (default working view)
 *   Explode -> every component type separated + labelled
 *   Pack    -> the tower ghosted, materials shown stored in the yard
 */
import { useFormworkStore, type ViewMode } from '../../store/formworkStore';

const MODES: Array<{ mode: ViewMode; label: string; title: string }> = [
  { mode: 'assembled', label: 'Build', title: 'Show the assembled tower (animates the build)' },
  { mode: 'exploded', label: 'Explode', title: 'Separate and label every component' },
  { mode: 'packed', label: 'Pack', title: 'Ghost the tower and show the materials in the storage yard' },
];

export function ViewModeToggle() {
  const viewMode = useFormworkStore((s) => s.viewMode);
  const setViewMode = useFormworkStore((s) => s.setViewMode);

  return (
    <div className="viewmode" role="group" aria-label="Viewport mode">
      {MODES.map((m) => (
        <button
          key={m.mode}
          type="button"
          className={`vm-btn${viewMode === m.mode ? ' active' : ''}`}
          title={m.title}
          aria-pressed={viewMode === m.mode}
          onClick={() => setViewMode(m.mode)}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
