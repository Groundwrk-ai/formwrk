/**
 * Small overlay in the top-left of the viewport: reframe the camera to the default pose
 * for the current view. (The shareable-link button lives in the Left Rail under the
 * Height Range card.)
 */
import { useFormworkStore } from '../../store/formworkStore';

export function ViewportControls() {
  const resetView = useFormworkStore((s) => s.resetView);

  return (
    <div className="viewport-controls" role="group" aria-label="Viewport actions">
      <button type="button" className="vc-btn" onClick={resetView} title="Reframe the camera to the default view">
        ⟲ Reset view
      </button>
    </div>
  );
}
