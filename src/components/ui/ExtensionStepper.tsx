/**
 * Head / Base extension control, shown inline in the components list. A drag slider (the
 * same one used by the height track) with the live extension shown in a bubble above it.
 * Mirrors the 3D screwjack drag — both write the same store value.
 */
import { useFormworkStore } from '../../store/formworkStore';
import { RangeSlider } from './RangeSlider';

export function ExtensionStepper({ which }: { which: 'uHead' | 'base' }) {
  const value = useFormworkStore((s) => (which === 'uHead' ? s.uHeadExtension : s.baseExtension));
  const range = useFormworkStore((s) => s.range);
  const setUHead = useFormworkStore((s) => s.setUHeadExtension);
  const setBase = useFormworkStore((s) => s.setBaseExtension);

  const setValue = which === 'uHead' ? setUHead : setBase;
  const min = which === 'uHead' ? range.uHeadMin : range.baseMin;
  const max = which === 'uHead' ? range.uHeadMax : range.baseMax;

  return (
    <div className="ext-slider">
      <RangeSlider
        min={min}
        max={max}
        value={value}
        onChange={setValue}
        ariaLabel={`${which === 'uHead' ? 'U-Head' : 'base'} extension in millimetres`}
      />
    </div>
  );
}
