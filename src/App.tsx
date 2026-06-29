import { FrameScene } from './components/scene/FrameScene';
import { Inputs } from './components/ui/Inputs';
import { Materials } from './components/ui/Materials';
import { HeightDisplay } from './components/ui/HeightDisplay';
import './App.css';

export default function App() {
  return (
    <div className="app">
      <aside className="panel">
        <h1 className="brand">
          Formwrk
          <small>Material Planning Tool</small>
        </h1>
        <Inputs />
        <Materials />
        <HeightDisplay />
        <div className="disclaimer">
          This is a material planning and configuration tool only. Temporary engineering
          designs and inspections, in accordance with local Standards and guidelines, are
          required prior to erecting any formwork.
        </div>
        <p className="foot">
          Drag-to-adjust screwjacks and the component palette arrive in the next phases.
        </p>
      </aside>
      <main className="viewport">
        <FrameScene />
      </main>
    </div>
  );
}
