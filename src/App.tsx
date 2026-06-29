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
          <small>Shoring system configurator</small>
        </h1>
        <Inputs />
        <Materials />
        <HeightDisplay />
        <p className="foot">
          Components and heights follow the material-selection spreadsheet. Drag-to-adjust
          screwjacks and the component palette arrive in the next phases.
        </p>
      </aside>
      <main className="viewport">
        <FrameScene />
      </main>
    </div>
  );
}
