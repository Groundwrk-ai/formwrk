/**
 * The serviceable-range track as a drag slider: drag (or arrow-key) to set the live
 * assembled height, which allocates the screwjacks to match — mirroring the 3D drag and
 * the Head/Base sliders. In Inputs it also shows the target-height marker.
 */
import { useFormworkStore } from '../../store/formworkStore';
import { RangeSlider } from './RangeSlider';

export function HeightTrack({ showTarget }: { showTarget: boolean }) {
  const range = useFormworkStore((s) => s.range);
  const currentHeight = useFormworkStore((s) => s.currentHeight);
  const slabHeight = useFormworkStore((s) => s.slabHeight);
  const setHeight = useFormworkStore((s) => s.setHeight);

  return (
    <RangeSlider
      min={range.min}
      max={range.max}
      value={currentHeight}
      onChange={setHeight}
      showTarget={showTarget}
      targetValue={slabHeight}
      ariaLabel="assembled height in millimetres"
    />
  );
}
