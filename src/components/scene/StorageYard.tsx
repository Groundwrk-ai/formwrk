/**
 * The storage yard shown in "packed" view: each material type sat in its own
 * designated container off to one side of the tower. Frames are stacked and
 * strapped on dunnage; cross-braces / extensions / prop-inners go in open steel
 * stillages; flat-jacks and U-heads go in heavy-duty mesh cages; timber is
 * banded into a stack.
 *
 * Step 1 = recognisable primitives. Step 2 will refine these from the supplied
 * stillage photos (the container kinds + positions come from logic/yardLayout,
 * so the geometry here can change without touching the layout).
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { Group, Material, Mesh } from 'three';
import { useFormworkStore } from '../../store/formworkStore';
import { computeYard, type YardContainer, type YardContents } from '../../logic/yardLayout';
import { FRAME_HEIGHTS } from '../../logic/frameData';
import { COLORS } from './primitives';
import { sampleWeights, useTransition, BUILD_SECONDS } from './transition';

const STEEL = '#aab0b8';
const STEEL_DARK = '#5c626b';
const CAGE = '#6d7059';
const STRAP = '#2b2f36';
const TIMBER_LVL = COLORS.bearer; // dunnage under the frame stacks

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

/** A short, thick metal bar/box used throughout the yard primitives. */
function Bar({
  position,
  size,
  color = STEEL,
  metalness = 0.6,
  roughness = 0.5,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color?: string;
  metalness?: number;
  roughness?: number;
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} />
    </mesh>
  );
}

/** Four corner posts + base pallet shared by stillages and cages. */
function Crate({ w, d, h, postColor }: { w: number; d: number; h: number; postColor: string }) {
  const hw = w / 2;
  const hd = d / 2;
  const post = 0.04;
  return (
    <group>
      {/* base pallet */}
      <Bar position={[0, 0.05, 0]} size={[w, 0.1, d]} color={STEEL_DARK} roughness={0.7} />
      {/* corner posts */}
      {[
        [-hw + post, -hd + post],
        [hw - post, -hd + post],
        [-hw + post, hd - post],
        [hw - post, hd - post],
      ].map(([x, z], i) => (
        <Bar key={i} position={[x, h / 2, z]} size={[post, h, post]} color={postColor} />
      ))}
      {/* top rails (front/back + sides) */}
      <Bar position={[0, h - 0.03, -hd + post]} size={[w, 0.05, post]} color={postColor} />
      <Bar position={[0, h - 0.03, hd - post]} size={[w, 0.05, post]} color={postColor} />
      <Bar position={[-hw + post, h - 0.03, 0]} size={[post, 0.05, d]} color={postColor} />
      <Bar position={[hw - post, h - 0.03, 0]} size={[post, 0.05, d]} color={postColor} />
      {/* low side rails (kick the bundle in) */}
      <Bar position={[0, 0.22, -hd + post]} size={[w, 0.04, post]} color={postColor} />
      <Bar position={[0, 0.22, hd - post]} size={[w, 0.04, post]} color={postColor} />
    </group>
  );
}

/** A row of horizontal cylinders lying in a bundle (braces / extensions). */
function TubeBundle({ count, length, radius, color }: { count: number; length: number; radius: number; color: string }) {
  const rows = 3;
  const perRow = Math.ceil(count / rows);
  const items: ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < perRow; c++) {
      const x = (c / Math.max(1, perRow - 1) - 0.5) * (perRow * radius * 2.4);
      const y = 0.16 + r * radius * 2.2;
      items.push(
        <mesh key={`${r}-${c}`} position={[x, y, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[radius, radius, length, 8]} />
          <meshStandardMaterial color={color} metalness={0.55} roughness={0.5} />
        </mesh>,
      );
    }
  }
  return <group>{items}</group>;
}

/** Vertical tubes standing in a stillage (prop inners). */
function StandingTubes({ count, height, radius, color }: { count: number; height: number; radius: number; color: string }) {
  const cols = Math.ceil(Math.sqrt(count));
  const items: ReactNode[] = [];
  for (let i = 0; i < count; i++) {
    const cx = (i % cols) / Math.max(1, cols - 1) - 0.5;
    const cz = Math.floor(i / cols) / Math.max(1, cols - 1) - 0.5;
    items.push(
      <mesh key={i} position={[cx * 0.5, 0.12 + height / 2, cz * 0.5]} castShadow>
        <cylinderGeometry args={[radius, radius, height, 8]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.45} />
      </mesh>,
    );
  }
  return <group>{items}</group>;
}

/** Open steel stillage holding a bundle of its contents. */
function SteelStillage({ contents }: { contents: YardContents }) {
  return (
    <group>
      <Crate w={1.0} d={0.9} h={0.7} postColor={STEEL} />
      {contents === 'braces' && <TubeBundle count={18} length={0.85} radius={0.012} color={STEEL} />}
      {contents === 'extensions' && <TubeBundle count={9} length={0.85} radius={0.024} color="#8b9097" />}
      {contents === 'propInners' && <StandingTubes count={9} height={0.5} radius={0.026} color="#bcc2ca" />}
    </group>
  );
}

/** Heavy-duty mesh cage holding jacks / U-heads standing up. */
function HeavyCage({ contents }: { contents: YardContents }) {
  const h = 1.0;
  return (
    <group>
      <Crate w={1.0} d={0.9} h={h} postColor={CAGE} />
      {/* a couple of mesh-suggesting horizontal bars per side */}
      {[0.45, 0.72].map((y) => (
        <group key={y}>
          <Bar position={[0, y, -0.41]} size={[0.95, 0.02, 0.02]} color={CAGE} />
          <Bar position={[0, y, 0.41]} size={[0.95, 0.02, 0.02]} color={CAGE} />
        </group>
      ))}
      <StandingTubes count={contents === 'flatJacks' ? 9 : 6} height={0.6} radius={0.02} color="#aeb4bc" />
      {/* a hint of forks / plates on top of the bundle */}
      {contents === 'uHeads' &&
        [-0.2, 0, 0.2].map((x) => <Bar key={x} position={[x, 0.78, 0]} size={[0.12, 0.03, 0.1]} color="#cdd3db" />)}
    </group>
  );
}

/** Frames laid flat, stacked with gaps on two dunnage timbers, strapped. */
function FrameStack({ size }: { size?: string }) {
  const layers = 6;
  const frameLen = Math.min(1.3, (FRAME_HEIGHTS[size ?? '6ft'] ?? 1830) / 1830 + 0.2); // longer for taller frames
  const layerGap = 0.12;
  return (
    <group>
      {/* dunnage timbers */}
      <Bar position={[-frameLen / 2 + 0.15, 0.05, 0]} size={[0.12, 0.1, 0.9]} color={TIMBER_LVL} metalness={0.05} roughness={0.85} />
      <Bar position={[frameLen / 2 - 0.15, 0.05, 0]} size={[0.12, 0.1, 0.9]} color={TIMBER_LVL} metalness={0.05} roughness={0.85} />
      {/* stacked flat frames (each a pair of rails + end rungs) */}
      {Array.from({ length: layers }, (_, i) => {
        const y = 0.12 + i * layerGap;
        return (
          <group key={i} position={[0, y, 0]}>
            <Bar position={[0, 0, -0.32]} size={[frameLen, 0.05, 0.05]} color={STEEL} />
            <Bar position={[0, 0, 0.32]} size={[frameLen, 0.05, 0.05]} color={STEEL} />
            <Bar position={[-frameLen / 2 + 0.05, 0, 0]} size={[0.05, 0.05, 0.66]} color={STEEL} />
            <Bar position={[frameLen / 2 - 0.05, 0, 0]} size={[0.05, 0.05, 0.66]} color={STEEL} />
          </group>
        );
      })}
      {/* strapping bands */}
      {[-0.45, 0.45].map((x) => (
        <Bar key={x} position={[x * frameLen, 0.12 + (layers * layerGap) / 2, 0]} size={[0.02, layers * layerGap + 0.1, 0.72]} color={STRAP} metalness={0.2} roughness={0.8} />
      ))}
    </group>
  );
}

function Container({ c }: { c: YardContainer }) {
  return (
    <group position={[c.pos[0], 0, c.pos[1]]}>
      {c.kind === 'steelStillage' && <SteelStillage contents={c.contents} />}
      {c.kind === 'heavyCage' && <HeavyCage contents={c.contents} />}
      {c.kind === 'frameStack' && <FrameStack size={c.size} />}
      <Html position={[0, c.labelY, 0]} center distanceFactor={9} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
        <div className={`yard-label${c.inUse ? '' : ' dim'}`}>{c.label}</div>
      </Html>
    </group>
  );
}

export function StorageYard() {
  const config = useFormworkStore((s) => s.config);
  const viewMode = useFormworkStore((s) => s.viewMode);
  const { driver } = useTransition();
  const groupRef = useRef<Group>(null);

  // Keep the yard mounted through the fade-out so it can animate away, then drop.
  const [mounted, setMounted] = useState(viewMode === 'packed');
  useEffect(() => {
    if (viewMode === 'packed') {
      setMounted(true);
      return;
    }
    // Stay mounted for the longest possible outgoing transition (the slow build).
    const id = setTimeout(() => setMounted(false), BUILD_SECONDS * 1000 + 120);
    return () => clearTimeout(id);
  }, [viewMode]);

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const yard = sampleWeights(driver.current).yard;
    g.visible = yard > 0.001;
    const opacity = clamp01(yard);
    const fading = opacity < 0.999;
    g.traverse((obj) => {
      const mat = (obj as Mesh).material as Material | Material[] | undefined;
      if (!mat) return;
      const mats = Array.isArray(mat) ? mat : [mat];
      for (const mm of mats) {
        if (!(mm as { isMeshStandardMaterial?: boolean }).isMeshStandardMaterial) continue;
        mm.transparent = fading;
        (mm as Material & { opacity: number }).opacity = opacity;
        mm.depthWrite = !fading;
      }
    });
  });

  if (!mounted) return null;

  return (
    <group ref={groupRef}>
      {computeYard(config).map((c) => (
        <Container key={c.id} c={c} />
      ))}
    </group>
  );
}
