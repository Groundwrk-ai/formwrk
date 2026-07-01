import { FrameScene } from './components/scene/FrameScene';
import { PanelTabs } from './components/ui/PanelTabs';
import { Inputs } from './components/ui/Inputs';
import { Materials } from './components/ui/Materials';
import { HeightDisplay } from './components/ui/HeightDisplay';
import { CustomPanel } from './components/ui/CustomPanel';
import { ViewModeToggle } from './components/ui/ViewModeToggle';
import { useFormworkStore } from './store/formworkStore';
import './App.css';

export default function App() {
  const panelMode = useFormworkStore((s) => s.panelMode);

  return (
    <div className="app">
      <aside className="panel">
        <h1 className="brand">
          Formwrk
          <small>Material Planning Tool</small>
        </h1>
        <PanelTabs />
        {panelMode === 'inputs' ? (
          <>
            <Inputs />
            <Materials />
            <HeightDisplay />
          </>
        ) : (
          <CustomPanel />
        )}
        <div className="disclaimer">
          This is a material planning and configuration tool only. Temporary engineering
          designs and inspections, in accordance with local Standards and guidelines, are
          required prior to erecting any formwork.
        </div>
        <p className="foot">
          {panelMode === 'inputs'
            ? 'Drag the screwjacks (or use the steppers) to set the height; the Other tab lists every valid configuration for the entered slab.'
            : 'Build a frame set from the bottom up; the height range shows what it can reach. Drag the screwjacks or use the steppers to set the current height.'}
        </p>
      </aside>
      <main className="viewport">
        <ViewModeToggle />
        <FrameScene />
      </main>
    </div>
  );
}
