import { FrameScene } from './components/scene/FrameScene';
import { Inputs } from './components/ui/Inputs';
import { HeightDisplay } from './components/ui/HeightDisplay';
import './App.css';

export default function App() {
  return (
    <div className="app">
      <aside className="panel">
        <h1 className="brand">
          Formwrk
          <small>Shoring configurator · Royal 60</small>
        </h1>
        <Inputs />
        <HeightDisplay />
        <p className="foot">
          Heights follow Formwork_Material_Selection_v2.xlsx. Drag-to-adjust screwjacks and the
          component palette arrive in the next phases.
        </p>
      </aside>
      <main className="viewport">
        <FrameScene />
      </main>
    </div>
  );
}
